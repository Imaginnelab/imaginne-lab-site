import 'server-only';
import type Stripe from 'stripe';
import { getAdmin, getCurrentUser, type CurrentUser } from '@/lib/dal';
import { checkoutSettings, stripeClient } from '@/lib/checkout/stripe';
import { sessionIdSchema } from '@/lib/checkout/schema';
import { productIdSchema } from '@/lib/products/input';
import { SUPABASE_URL } from '@/lib/env';
import { isStoreOrder, orderStatus, orderRevision, fulfillmentStatuses, type OrderSummary, type OrderDetailResult, type OrderListResult } from './model';
import { decodeOrderCursor, encodeOrderCursor } from './cursor';
import { adminOrderFiltersSchema, defaultOrderFilters, matchesOrderFilters, orderCreatedRange, type AdminOrderFilters } from './filters';

function safeImage(url: unknown): string | null {
  return typeof url === 'string' && url.startsWith(SUPABASE_URL + '/storage/v1/object/public/product-images/') && url.length <= 1000 ? url : null;
}
function date(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}\.\d{3}Z)?$/.test(value)) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}
function summary(session: Stripe.Checkout.Session): OrderSummary {
  const quantity = Number(session.metadata?.order_quantity);
  return { id: session.id, number: session.id.slice(-10).toUpperCase(), createdAt: new Date(session.created * 1000).toISOString(),
    status: orderStatus(session), amountCents: session.amount_total ?? 0,
    preview: (session.metadata?.order_preview ?? '').slice(0, 250), quantity: Number.isInteger(quantity) && quantity > 0 && quantity <= 4950 ? quantity : null,
    image: safeImage(session.metadata?.order_image), estimatedDelivery: date(session.metadata?.order_estimated_delivery) };
}

async function listOrders(user: CurrentUser, admin: boolean, input: unknown, filters: AdminOrderFilters = defaultOrderFilters): Promise<OrderListResult> {
  const settings = checkoutSettings();
  if (!settings) return { ok: false, error: 'configuration' };
  const scope = (admin ? 'admin:' : 'customer:') + user.id + (admin ? ':' + JSON.stringify(filters) : '');
  const cursor = input === undefined ? undefined : decodeOrderCursor(input, scope, settings.key);
  if (input !== undefined && !cursor) return { ok: false, error: 'notFound' };
  try {
    const stripe = stripeClient(settings);
    let after = cursor ?? undefined;
    const found: Stripe.Checkout.Session[] = [];
    let hasMore = false;
    const created = admin ? orderCreatedRange(filters) : undefined;
    // Authorize exclusively by the verified user ID. Email is deliberately not a
    // provider filter: purchases must survive a subsequent account email change.
    for (let page = 0; page < 5; page++) {
      const result = await stripe.checkout.sessions.list({ limit: 100, status: 'complete', ...(after ? { starting_after: after } : {}), ...(created ? { created } : {}) });
      found.push(...result.data.filter((session) => isStoreOrder(session) && (admin ? matchesOrderFilters(session, filters) : session.client_reference_id === user.id)));
      hasMore = result.has_more;
      after = result.data.at(-1)?.id;
      if (found.length > 20 || !hasMore) break;
      if (!after) break;
    }
    const page = found.slice(0, 20);
    const orders = await Promise.all(page.map(async (session) => {
      const order = summary(session);
      if (!order.preview) {
        try {
          const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1, expand: ['data.price.product'] });
          const first = items.data[0];
          if (first) { order.preview = first.description ?? ''; order.quantity = items.has_more ? null : first.quantity;
            const product = first.price?.product;
            if (typeof product === 'object' && product && !product.deleted) order.image = safeImage(product.images?.[0]); }
        } catch { /* The order remains visible if its optional preview is unavailable. */ }
      }
      return order;
    }));
    const nextId = found.length > 20 ? page.at(-1)!.id : hasMore ? after : null;
    return { ok: true, orders, next: nextId ? encodeOrderCursor(nextId, scope, settings.key) : null };
  } catch { return { ok: false, error: 'unavailable' }; }
}

export async function listMyOrders(after?: unknown): Promise<OrderListResult> {
  const user = await getCurrentUser();
  return user ? listOrders(user, false, after) : { ok: false, error: 'signIn' };
}
export async function listAdminOrders(after?: unknown, filters?: unknown): Promise<OrderListResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: 'signIn' };
  const parsed = adminOrderFiltersSchema.safeParse(filters ?? {});
  return parsed.success ? listOrders(admin, true, after, parsed.data) : { ok: false, error: 'filters' };
}

async function readOrder(id: unknown, user: CurrentUser, admin: boolean): Promise<OrderDetailResult> {
  const parsed = sessionIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'notFound' };
  const settings = checkoutSettings();
  if (!settings) return { ok: false, error: 'configuration' };
  try {
    const stripe = stripeClient(settings);
    const session = await stripe.checkout.sessions.retrieve(parsed.data);
    if (!isStoreOrder(session) || (!admin && session.client_reference_id !== user.id)) return { ok: false, error: 'notFound' };
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100, expand: ['data.price.product'] });
    if (lineItems.has_more) return { ok: false, error: 'unavailable' };
    const shipping = session.collected_information?.shipping_details;
    const address = shipping?.address;
    const trackingNumber = /^[A-Za-z0-9 -]{1,50}$/.test(session.metadata?.order_tracking ?? '') ? session.metadata!.order_tracking : '';
    const timeline = Object.fromEntries(fulfillmentStatuses.flatMap((status) => {
      const at = date(session.metadata?.['order_at_' + status]); return at ? [[status, at]] : [];
    }));
    return { ok: true, order: { ...summary(session),
      items: lineItems.data.map((line) => {
        const product = line.price?.product;
        const expanded = typeof product === 'object' && product && !product.deleted ? product : null;
        const productId = productIdSchema.safeParse(expanded?.metadata?.product_id);
        return { name: line.description ?? '', quantity: line.quantity ?? 1, amountCents: line.amount_total,
          image: safeImage(expanded?.images?.[0]) ?? safeImage(expanded?.metadata?.product_image), productId: productId.success ? productId.data : null };
      }),
      subtotalCents: session.amount_subtotal ?? 0, shippingCents: session.total_details?.amount_shipping ?? 0, taxCents: session.total_details?.amount_tax ?? 0,
      recipient: shipping && address ? { name: shipping.name, line1: address.line1 ?? '', line2: address.line2 ?? '', city: address.city ?? '',
        province: address.state ?? '', postalCode: address.postal_code ?? '', country: address.country ?? '' } : null,
      trackingNumber, trackingUrl: trackingNumber ? 'https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=' + encodeURIComponent(trackingNumber) : null,
      revision: orderRevision(session), timeline,
    } };
  } catch { return { ok: false, error: 'unavailable' }; }
}
export async function getMyOrder(id: unknown): Promise<OrderDetailResult> {
  const user = await getCurrentUser();
  return user ? readOrder(id, user, false) : { ok: false, error: 'signIn' };
}
export async function getAdminOrder(id: unknown): Promise<OrderDetailResult> {
  const admin = await getAdmin();
  return admin ? readOrder(id, admin, true) : { ok: false, error: 'signIn' };
}
