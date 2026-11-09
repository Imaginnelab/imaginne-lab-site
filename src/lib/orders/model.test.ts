import { expect, test } from 'vitest';
import type Stripe from 'stripe';
import { canTransition, isStoreOrder, orderStatus, orderUpdateSchema } from './model';

const session = { id: 'cs_test_order', livemode: false, mode: 'payment', currency: 'cad', status: 'complete', payment_status: 'paid',
  metadata: { source: 'imaginne-lab-test' } } as unknown as Stripe.Checkout.Session;

test('payment remains authoritative even when fulfillment metadata claims delivery', () => {
  expect(orderStatus(session)).toBe('confirmed');
  expect(orderStatus({ ...session, payment_status: 'unpaid', metadata: { ...session.metadata, order_status: 'delivered' } })).toBe('payment_pending');
  expect(orderStatus({ ...session, metadata: { ...session.metadata, order_status: 'invented' } })).toBe('confirmed');
});

test('only this integration, test mode, CAD and completed checkout sessions are orders', () => {
  expect(isStoreOrder(session)).toBe(true);
  for (const changed of [{ livemode: true }, { metadata: {} }, { currency: 'usd' }, { status: 'open' }, { id: 'cs_live_order' }]) {
    expect(isStoreOrder({ ...session, ...changed } as Stripe.Checkout.Session)).toBe(false);
  }
});

test('status transitions do not reverse completed stages or advance unpaid orders', () => {
  expect(canTransition('confirmed', 'in_production')).toBe(true);
  expect(canTransition('confirmed', 'shipped')).toBe(true);
  expect(canTransition('shipped', 'packing')).toBe(false);
  expect(canTransition('payment_pending', 'delivered')).toBe(false);
  expect(canTransition('delivered', 'canceled')).toBe(false);
  expect(canTransition('canceled', 'shipped')).toBe(false);
});

test('updates reject injected fields and unsafe tracking data', () => {
  const input = { id: 'cs_test_order', status: 'shipped', trackingNumber: '1234 5678 9012', estimatedDelivery: '2026-12-10', revision: 0 };
  expect(orderUpdateSchema.parse(input).trackingNumber).toBe('123456789012');
  for (const changed of [{ user_id: 'other' }, { trackingNumber: 'javascript:alert(1)' }, { estimatedDelivery: '2026-02-31' }, { revision: -1 }, { status: 'refunded' }]) {
    expect(orderUpdateSchema.safeParse({ ...input, ...changed }).success).toBe(false);
  }
});
