import { beforeEach, expect, test, vi } from 'vitest';
import type Stripe from 'stripe';

const state = vi.hoisted(() => ({ user: { id: 'owner', email: 'owner@isolated.test' } as { id: string; email: string } | null,
  admin: false, retrieve: vi.fn(), list: vi.fn(), items: vi.fn(), configured: true }));
vi.mock('@/lib/dal', () => ({ getCurrentUser: async () => state.user, getAdmin: async () => state.admin ? state.user : null }));
vi.mock('@/lib/checkout/stripe', () => ({ checkoutSettings: () => state.configured ? { key: 'isolated-cursor-key' } : null,
  stripeClient: () => ({ checkout: { sessions: { retrieve: state.retrieve, list: state.list, listLineItems: state.items } } }) }));
import { listMyOrders, getMyOrder, listAdminOrders, getAdminOrder } from './queries';
import { decodeOrderCursor } from './cursor';
const session = { id: 'cs_test_order', created: 1794000000, livemode: false, mode: 'payment', currency: 'cad', status: 'complete', payment_status: 'paid', client_reference_id: 'owner',
  amount_subtotal: 4990, amount_total: 6204, total_details: { amount_shipping: 500, amount_tax: 714 }, metadata: { source: 'imaginne-lab-test', order_preview: 'Vaso', order_quantity: '1' } } as unknown as Stripe.Checkout.Session;

beforeEach(() => {
  Object.assign(state, { user: { id: 'owner', email: 'owner@isolated.test' }, admin: false, configured: true });
  vi.clearAllMocks();
  state.retrieve.mockResolvedValue(session);
  state.list.mockResolvedValue({ data: [session], has_more: false });
  state.items.mockResolvedValue({ data: [{ description: 'Vaso · Rosa', quantity: 1, amount_total: 4990, price: { product: { metadata: {}, images: [] } } }], has_more: false });
});

test('visitors and non-admin callers are refused before any Stripe access', async () => {
  state.user = null;
  expect(await listMyOrders()).toMatchObject({ error: 'signIn' });
  expect(await getMyOrder(session.id)).toMatchObject({ error: 'signIn' });
  expect(await listAdminOrders()).toMatchObject({ error: 'signIn' });
  expect(await getAdminOrder(session.id)).toMatchObject({ error: 'signIn' });
  expect(state.list).not.toHaveBeenCalled(); expect(state.retrieve).not.toHaveBeenCalled();
});

test('list filters by verified user ID even when email matches someone else', async () => {
  state.list.mockResolvedValue({ data: [session, { ...session, id: 'cs_test_other', client_reference_id: 'other', metadata: { ...session.metadata, order_preview: 'Private item' } }], has_more: false });
  const result = await listMyOrders();
  expect(result.ok && result.orders.map((order) => order.id)).toEqual([session.id]);
  expect(state.list.mock.calls[0][0]).not.toHaveProperty('customer_details');
  expect(JSON.stringify(result)).not.toContain('Private item');
});

test('knowing a session ID or pagination cursor never grants access to another user', async () => {
  state.retrieve.mockResolvedValue({ ...session, client_reference_id: 'other' });
  expect(await getMyOrder(session.id)).toEqual({ ok: false, error: 'notFound' });
  expect(await listMyOrders(session.id)).toMatchObject({ error: 'notFound' });
  expect(state.items).not.toHaveBeenCalled(); expect(state.list).not.toHaveBeenCalled();
});

test('administrators may read customer orders while their personal history stays restricted', async () => {
  state.admin = true;
  state.retrieve.mockResolvedValue({ ...session, client_reference_id: 'customer' });
  expect((await getAdminOrder(session.id)).ok).toBe(true);
  expect(await getMyOrder(session.id)).toMatchObject({ error: 'notFound' });
});

test('item and price snapshots survive removal from the catalogue; tracking cannot be an arbitrary URL', async () => {
  state.retrieve.mockResolvedValue({ ...session, metadata: { ...session.metadata, order_status: 'shipped', order_tracking: 'javascript:alert(1)' } });
  const result = await getMyOrder(session.id);
  expect(result).toMatchObject({ ok: true, order: { status: 'shipped', amountCents: 6204, items: [{ name: 'Vaso · Rosa', amountCents: 4990 }], trackingNumber: '', trackingUrl: null } });
});

test('provider failures are recoverable and private error details stay on the server', async () => {
  state.list.mockRejectedValue(new Error('private provider detail'));
  expect(await listMyOrders()).toEqual({ ok: false, error: 'unavailable' });
  state.configured = false;
  expect(await getMyOrder(session.id)).toMatchObject({ error: 'configuration' });
});

test('pagination does not skip matching purchases and survives an account email change', async () => {
  const sessions = Array.from({ length: 25 }, (_, index) => ({ ...session, id: 'cs_test_order' + index }));
  state.list.mockImplementation(async ({ starting_after }: { starting_after?: string }) => {
    const index = starting_after ? sessions.findIndex((item) => item.id === starting_after) + 1 : 0;
    return { data: sessions.slice(index), has_more: false };
  });
  const first = await listMyOrders();
  expect(first.ok && first.orders.length).toBe(20);
  if (!first.ok || !first.next) throw new Error('Expected another page');
  expect(decodeOrderCursor(first.next, 'customer:owner', 'isolated-cursor-key')).toBe('cs_test_order19');
  state.user = { id: 'owner', email: 'changed@isolated.test' };
  const next = await listMyOrders(first.next);
  expect(next.ok && next.orders.map((order) => order.id)).toEqual(sessions.slice(20).map((item) => item.id));
  expect(next.ok && next.next).toBeNull();
});

test('a scan containing only other customers returns a private continuation, not a false empty-history claim', async () => {
  state.list.mockResolvedValue({ data: [{ ...session, id: 'cs_test_private', client_reference_id: 'other' }], has_more: true });
  const result = await listMyOrders();
  expect(state.list).toHaveBeenCalledTimes(5);
  expect(result.ok && result.orders).toEqual([]);
  expect(result.ok && result.next).toBeTruthy();
  expect(JSON.stringify(result)).not.toContain('cs_test_private');
});

test('admin filters validate input before provider access and preserve authorization', async () => {
  expect(await listAdminOrders(undefined, { status: 'shipped' })).toMatchObject({ error: 'signIn' });
  state.admin = true;
  expect(await listAdminOrders(undefined, { from: '2026-11-09', to: '2026-11-08' })).toMatchObject({ error: 'filters' });
  expect(state.list).not.toHaveBeenCalled();
});

test('admin status filtering uses the payment-aware order status and pushes creation ranges to Stripe', async () => {
  state.admin = true;
  const created = Date.parse('2026-11-08T12:00:00Z') / 1000;
  state.list.mockResolvedValue({ data: [
    { ...session, id: 'cs_test_shipped', created, metadata: { ...session.metadata, order_status: 'shipped' } },
    { ...session, id: 'cs_test_pending', created, payment_status: 'unpaid', metadata: { ...session.metadata, order_status: 'shipped' } },
    { ...session, id: 'cs_test_old', created: created - 86_400, metadata: { ...session.metadata, order_status: 'shipped' } },
  ], has_more: false });
  const result = await listAdminOrders(undefined, { status: 'shipped', from: '2026-11-08', to: '2026-11-08' });
  expect(result.ok && result.orders.map((order) => order.id)).toEqual(['cs_test_shipped']);
  expect(state.list.mock.calls[0][0].created).toEqual({ gte: Date.parse('2026-11-08T03:00:00Z') / 1000, lt: Date.parse('2026-11-09T03:00:00Z') / 1000 });
  const pending = await listAdminOrders(undefined, { status: 'payment_pending' });
  expect(pending.ok && pending.orders.map((order) => order.id)).toEqual(['cs_test_pending']);
});

test('admin pagination retains filtered results and refuses a cursor reused with different filters', async () => {
  state.admin = true;
  const sessions = Array.from({ length: 50 }, (_, index) => ({ ...session, id: 'cs_test_order' + index,
    metadata: { ...session.metadata, order_status: index % 2 ? 'confirmed' : 'shipped' } }));
  state.list.mockImplementation(async ({ starting_after }: { starting_after?: string }) => ({
    data: sessions.slice(starting_after ? sessions.findIndex((item) => item.id === starting_after) + 1 : 0), has_more: false,
  }));
  const first = await listAdminOrders(undefined, { status: 'shipped' });
  expect(first.ok && first.orders.length).toBe(20);
  if (!first.ok || !first.next) throw new Error('Expected another filtered page');
  const next = await listAdminOrders(first.next, { status: 'shipped' });
  expect(next.ok && next.orders.map((order) => order.id)).toEqual(sessions.filter((_, index) => index % 2 === 0).slice(20).map((item) => item.id));
  state.list.mockClear();
  expect(await listAdminOrders(first.next, { status: 'confirmed' })).toMatchObject({ error: 'notFound' });
  expect(state.list).not.toHaveBeenCalled();
});
