import { beforeEach, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: { id: 'user', email: 'user@isolated.test' } as { id: string; email: string } | null,
  configured: true, taxEnabled: false, price: 4990, creates: vi.fn(), reads: vi.fn(),
  settings: vi.fn(), registrations: vi.fn(),
}));
vi.mock('@/lib/dal', () => ({ getCurrentUser: async () => state.user }));
vi.mock('@/lib/products/queries', () => ({ getCartProducts: (...args: unknown[]) => {
  state.reads(...args);
  return { ok: true, products: [{ id: '10000000-0000-4000-8000-000000000001', name: 'Vaso', priceCents: state.price, colors: [], stockQuantity: 5, photos: ['/vase.jpg'] }] };
} }));
vi.mock('./stripe', () => ({
  CHECKOUT_SOURCE: 'imaginne-lab-test', INTEGRATION_IDENTIFIER: 'imaginne_checkout_ktxqnrva',
  checkoutSettings: () => state.configured ? { origin: 'http://localhost:3000', shippingCents: 0, taxEnabled: state.taxEnabled } : null,
  validCheckoutUrl: (url: string) => url === 'https://checkout.stripe.com/test',
  stripeClient: () => ({ checkout: { sessions: { create: state.creates } }, tax: { settings: { retrieve: state.settings }, registrations: { list: state.registrations } } }),
}));
import { createCheckout } from './actions';
const input = { locale: 'pt', lines: [{ id: '10000000-0000-4000-8000-000000000001', quantity: 2 }], subtotalCents: 9980, requestId: '40000000-0000-4000-8000-000000000001' };

beforeEach(() => {
  Object.assign(state, { user: { id: 'user', email: 'user@isolated.test' }, configured: true, taxEnabled: false, price: 4990 });
  vi.clearAllMocks();
  state.creates.mockResolvedValue({ livemode: false, url: 'https://checkout.stripe.com/test' });
  state.settings.mockResolvedValue({ status: 'active' });
  state.registrations.mockResolvedValue({ data: [{ country: 'CA', status: 'active' }] });
});

test('rejects malformed input and unauthenticated calls before product or Stripe access', async () => {
  expect(await createCheckout({ ...input, price: 1 })).toMatchObject({ error: 'invalid' });
  state.user = null;
  expect(await createCheckout(input)).toMatchObject({ error: 'signIn' });
  expect(state.reads).not.toHaveBeenCalled(); expect(state.creates).not.toHaveBeenCalled();
});

test('validates current price and refuses to silently charge a changed amount', async () => {
  state.price = 5100;
  expect(await createCheckout(input)).toMatchObject({ error: 'priceChanged' });
  expect(state.creates).not.toHaveBeenCalled();
});

test('uses verified identity, server prices, CAD, dynamic payment methods and stable retry keys', async () => {
  expect(await createCheckout(input)).toEqual({ ok: true, url: 'https://checkout.stripe.com/test' });
  await createCheckout(input);
  const [params, options] = state.creates.mock.calls[0];
  expect(params.client_reference_id).toBe('user');
  expect(params.line_items[0].price_data).toMatchObject({ unit_amount: 4990, currency: 'cad' });
  expect(params).not.toHaveProperty('payment_method_types');
  expect(params.success_url).toContain('/pt/checkout/result/?session_id={CHECKOUT_SESSION_ID}');
  expect(state.creates.mock.calls[1][1]).toEqual(options);
  await createCheckout({ ...input, requestId: '40000000-0000-4000-8000-000000000002' });
  expect(state.creates.mock.calls[2][1]).not.toEqual(options);
});

test('Tax requires active settings and a Canadian registration before creating a session', async () => {
  state.taxEnabled = true;
  state.registrations.mockResolvedValue({ data: [] });
  expect(await createCheckout(input)).toMatchObject({ error: 'taxConfiguration' });
  expect(state.creates).not.toHaveBeenCalled();
  state.registrations.mockResolvedValue({ data: [{ country: 'CA', status: 'active' }] });
  expect((await createCheckout(input)).ok).toBe(true);
  expect(state.creates.mock.calls[0][0].automatic_tax).toEqual({ enabled: true });
});

test('configuration, Stripe errors, live responses and untrusted URLs never expose provider details', async () => {
  state.configured = false; expect(await createCheckout(input)).toMatchObject({ error: 'configuration' });
  state.configured = true;
  state.creates.mockRejectedValueOnce(new Error('secret provider error'));
  expect(await createCheckout(input)).toEqual({ ok: false, error: 'unavailable' });
  for (const session of [{ livemode: true, url: 'https://checkout.stripe.com/test' }, { livemode: false, url: 'https://attacker.test' }]) {
    state.creates.mockResolvedValueOnce(session); expect(await createCheckout(input)).toMatchObject({ error: 'unavailable' });
  }
});
