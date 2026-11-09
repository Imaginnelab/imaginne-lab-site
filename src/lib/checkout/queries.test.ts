import { beforeEach, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: { id: 'owner' } as { id: string } | null,
  retrieve: vi.fn(),
}));
vi.mock('@/lib/dal', () => ({ getCurrentUser: async () => state.user }));
vi.mock('./stripe', () => ({ CHECKOUT_SOURCE: 'imaginne-lab-test', checkoutSettings: () => ({}), stripeClient: () => ({ checkout: { sessions: { retrieve: state.retrieve } } }) }));
import { getCheckoutReceipt } from './queries';
const session = { id: 'cs_test_receipt', livemode: false, mode: 'payment', client_reference_id: 'owner', metadata: { source: 'imaginne-lab-test' },
  status: 'complete', payment_status: 'paid', currency: 'cad', amount_total: 6204, total_details: { amount_tax: 714, amount_shipping: 500 } };

beforeEach(() => { state.user = { id: 'owner' }; vi.clearAllMocks(); state.retrieve.mockResolvedValue(session); });

test('receipt requires the same verified user and a test Session created by this integration', async () => {
  expect(await getCheckoutReceipt('cs_test_receipt')).toEqual({ status: 'paid', amountCents: 6204, taxCents: 714, shippingCents: 500 });
  for (const changed of [{ client_reference_id: 'other' }, { livemode: true }, { metadata: {} }, { currency: 'usd' }]) {
    state.retrieve.mockResolvedValueOnce({ ...session, ...changed }); expect(await getCheckoutReceipt('cs_test_receipt')).toBeNull();
  }
  state.user = null; expect(await getCheckoutReceipt('cs_test_receipt')).toBeNull();
});

test('invalid session IDs cause no Stripe request and a completed but unpaid session stays pending', async () => {
  for (const id of ['cs_live_forged', null, ['cs_test_receipt'], 'x'.repeat(1000)]) expect(await getCheckoutReceipt(id)).toBeNull();
  expect(state.retrieve).not.toHaveBeenCalled();
  state.retrieve.mockResolvedValueOnce({ ...session, payment_status: 'unpaid' });
  expect(await getCheckoutReceipt('cs_test_receipt')).toMatchObject({ status: 'pending' });
});
