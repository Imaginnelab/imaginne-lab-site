import { beforeEach, expect, test, vi } from 'vitest';
import type Stripe from 'stripe';

const state = vi.hoisted(() => ({ admin: true, retrieve: vi.fn(), update: vi.fn(), revalidate: vi.fn() }));
vi.mock('@/lib/dal', () => ({ getAdmin: async () => state.admin ? { id: 'admin' } : null }));
vi.mock('next/cache', () => ({ revalidatePath: state.revalidate }));
vi.mock('@/lib/checkout/stripe', () => ({ checkoutSettings: () => ({}), stripeClient: () => ({ checkout: { sessions: { retrieve: state.retrieve, update: state.update } } }) }));
import { updateOrderStatus } from './actions';

const base = { id: 'cs_test_order', mode: 'payment', currency: 'cad', status: 'complete', payment_status: 'paid', livemode: false, metadata: { source: 'imaginne-lab-test' } } as unknown as Stripe.Checkout.Session;
let session: Stripe.Checkout.Session;
const input = { id: base.id, revision: 0, status: 'in_production', trackingNumber: '', estimatedDelivery: '' };
beforeEach(() => {
  state.admin = true; vi.clearAllMocks(); session = structuredClone(base);
  state.retrieve.mockImplementation(async () => structuredClone(session));
  state.update.mockImplementation(async (_id: string, value: { metadata: Record<string, string> }) => { session.metadata = { ...session.metadata, ...value.metadata }; return session; });
});

test('non-admin callers cannot mutate or even retrieve an order', async () => {
  state.admin = false;
  expect(await updateOrderStatus(input)).toEqual({ ok: false, error: 'forbidden' });
  expect(state.retrieve).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
});

test('validated status changes persist a revision and timestamp and refresh order pages', async () => {
  expect(await updateOrderStatus(input)).toEqual({ ok: true });
  expect(session.metadata).toMatchObject({ order_status: 'in_production', order_revision: '1' });
  expect(session.metadata?.order_at_in_production).toMatch(/^\d{4}-/);
  expect(state.revalidate).toHaveBeenCalledWith('/pt/orders/');
  expect(state.revalidate).toHaveBeenCalledWith('/pt/admin/orders/cs_test_order/');
});

test('concurrent stale edits cannot overwrite a newer update on the local server', async () => {
  const results = await Promise.all([updateOrderStatus(input), updateOrderStatus({ ...input, status: 'shipped' })]);
  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(results).toContainEqual({ ok: false, error: 'conflict' });
  expect(state.update).toHaveBeenCalledTimes(1);
});

test('unpaid, live and foreign integrations are not fulfillment targets', async () => {
  for (const changed of [{ payment_status: 'unpaid' }, { livemode: true }, { metadata: { source: 'other' } }]) {
    session = { ...structuredClone(base), ...changed } as Stripe.Checkout.Session;
    expect((await updateOrderStatus(input)).ok).toBe(false);
  }
  expect(state.update).not.toHaveBeenCalled();
});

test('completed stages cannot move backwards and unsafe tracking input is rejected', async () => {
  session.metadata = { ...session.metadata, order_status: 'delivered' };
  expect(await updateOrderStatus(input)).toMatchObject({ error: 'transition' });
  expect(await updateOrderStatus({ ...input, trackingNumber: 'https://attacker.test' })).toMatchObject({ error: 'invalid' });
  expect(state.update).not.toHaveBeenCalled();
});
