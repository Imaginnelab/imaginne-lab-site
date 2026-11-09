'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getAdmin } from '@/lib/dal';
import { locales, localePath } from '@/i18n/config';
import { checkoutSettings, stripeClient } from '@/lib/checkout/stripe';
import { orderUpdateSchema, isStoreOrder, orderStatus, orderRevision, canTransition } from './model';
import { withOrderLock } from './lock';

export type OrderUpdateResult = { ok: true } | { ok: false; error: 'forbidden' | 'invalid' | 'conflict' | 'transition' | 'unavailable' };

export async function updateOrderStatus(input: unknown): Promise<OrderUpdateResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: 'forbidden' };
  const parsed = orderUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const settings = checkoutSettings();
  if (!settings) return { ok: false, error: 'unavailable' };
  const value = parsed.data;
  return withOrderLock(value.id, async () => {
    try {
      const stripe = stripeClient(settings);
      const session = await stripe.checkout.sessions.retrieve(value.id);
      if (!isStoreOrder(session)) return { ok: false, error: 'invalid' };
      if (orderRevision(session) !== value.revision) return { ok: false, error: 'conflict' };
      const before = orderStatus(session);
      if (!canTransition(before, value.status)) return { ok: false, error: 'transition' };
      if (value.trackingNumber && !['shipped', 'delivered'].includes(value.status)) return { ok: false, error: 'invalid' };
      const timestamp = new Date().toISOString();
      const metadata = { order_status: value.status, order_revision: String(value.revision + 1), order_tracking: value.trackingNumber,
        order_estimated_delivery: value.estimatedDelivery,
        ...(before !== value.status ? { ['order_at_' + value.status]: timestamp } : {}) };
      const key = createHash('sha256').update(JSON.stringify({ id: value.id, revision: value.revision, metadata })).digest('hex');
      await stripe.checkout.sessions.update(value.id, { metadata }, { idempotencyKey: 'order-status-' + key });
      for (const locale of locales) {
        revalidatePath(localePath(locale, '/orders')); revalidatePath(localePath(locale, '/orders/' + value.id));
        revalidatePath(localePath(locale, '/admin/orders')); revalidatePath(localePath(locale, '/admin/orders/' + value.id));
      }
      return { ok: true };
    } catch { return { ok: false, error: 'unavailable' }; }
  });
}
