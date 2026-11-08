import type Stripe from 'stripe';
import { z } from 'zod';
import { sessionIdSchema } from '@/lib/checkout/schema';
import { CHECKOUT_SOURCE } from '@/lib/checkout/constants';

export const fulfillmentStatuses = ['confirmed', 'in_production', 'packing', 'shipped', 'delivered', 'canceled'] as const;
export const ORDER_TIME_ZONE = 'America/Sao_Paulo';
export type FulfillmentStatus = (typeof fulfillmentStatuses)[number];
export type OrderStatus = FulfillmentStatus | 'payment_pending';
export const fulfillmentSchema = z.enum(fulfillmentStatuses);
export const orderUpdateSchema = z.object({
  id: sessionIdSchema, status: fulfillmentSchema, revision: z.number().int().min(0).max(1_000_000),
  trackingNumber: z.string().trim().max(50).regex(/^[A-Za-z0-9 -]*$/).transform((value) => value.replace(/\s/g, '')),
  estimatedDelivery: z.union([z.literal(''), z.iso.date()]),
}).strict();
export type OrderUpdate = z.output<typeof orderUpdateSchema>;
export type OrderSummary = {
  id: string; number: string; createdAt: string; status: OrderStatus; amountCents: number;
  preview: string; quantity: number | null; image: string | null; estimatedDelivery: string | null;
};
export type OrderItem = { name: string; quantity: number; amountCents: number; image: string | null; productId: string | null };
export type OrderDetail = OrderSummary & {
  items: OrderItem[]; subtotalCents: number; shippingCents: number; taxCents: number;
  recipient: { name: string; line1: string; line2: string; city: string; province: string; postalCode: string; country: string } | null;
  trackingNumber: string; trackingUrl: string | null; revision: number; timeline: Partial<Record<FulfillmentStatus, string>>;
};
export type OrdersError = 'signIn' | 'configuration' | 'unavailable' | 'notFound';
export type OrderListResult = { ok: true; orders: OrderSummary[]; next: string | null } | { ok: false; error: OrdersError | 'filters' };
export type OrderDetailResult = { ok: true; order: OrderDetail } | { ok: false; error: OrdersError };

export function isStoreOrder(session: Stripe.Checkout.Session): boolean {
  return !session.livemode && session.mode === 'payment' && session.currency === 'cad'
    && session.metadata?.source === CHECKOUT_SOURCE && sessionIdSchema.safeParse(session.id).success
    && session.status === 'complete';
}

export function orderStatus(session: Stripe.Checkout.Session): OrderStatus {
  if (session.status !== 'complete' || !['paid', 'no_payment_required'].includes(session.payment_status)) return 'payment_pending';
  const parsed = fulfillmentSchema.safeParse(session.metadata?.order_status);
  return parsed.success ? parsed.data : 'confirmed';
}

export function orderRevision(session: Stripe.Checkout.Session): number {
  const value = session.metadata?.order_revision;
  return value && /^\d{1,7}$/.test(value) ? Math.min(1_000_000, Number(value)) : 0;
}

export function canTransition(from: OrderStatus, to: FulfillmentStatus): boolean {
  if (from === 'payment_pending') return false;
  if (from === to) return true;
  if (from === 'delivered' || from === 'canceled') return false;
  return to === 'canceled' || fulfillmentStatuses.indexOf(to) > fulfillmentStatuses.indexOf(from);
}
