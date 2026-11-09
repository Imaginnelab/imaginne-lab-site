import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import Stripe from 'stripe';
import { POST } from '@/app/api/stripe/webhook/route';

const stripe = new Stripe('rk_test_isolated');
const secret = 'whsec_isolated';
beforeEach(() => {
  vi.stubEnv('STRIPE_CHECKOUT_ENABLED', 'true'); vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_isolated');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret); vi.stubEnv('CHECKOUT_SITE_URL', 'http://localhost:3000');
  vi.stubEnv('VERCEL', ''); vi.stubEnv('VERCEL_ENV', '');
});
afterEach(() => vi.unstubAllEnvs());
function eventRequest(type: string, payment = 'paid', live = false) {
  const payload = JSON.stringify({ id: 'evt_isolated', object: 'event', type, livemode: live,
    data: { object: { id: 'cs_test_isolated', mode: 'payment', livemode: false, metadata: { source: 'imaginne-lab-test' }, status: 'complete', payment_status: payment } } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request('http://localhost:3000/api/stripe/webhook/', { method: 'POST', body: payload, headers: { 'stripe-signature': signature } });
}

test('rejects missing or forged signatures and live events', async () => {
  expect((await POST(new Request('http://localhost/api/stripe/webhook/', { method: 'POST', body: '{}' }))).status).toBe(400);
  expect((await POST(new Request('http://localhost/api/stripe/webhook/', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'forged' } }))).status).toBe(400);
  expect((await POST(eventRequest('checkout.session.completed', 'paid', true))).status).toBe(400);
});

test('handles completion and delayed outcomes without treating unpaid completion as success', async () => {
  expect(await (await POST(eventRequest('checkout.session.completed', 'unpaid'))).json()).toMatchObject({ status: 'pending', testOnly: true });
  expect(await (await POST(eventRequest('checkout.session.async_payment_succeeded'))).json()).toMatchObject({ status: 'paid' });
  expect(await (await POST(eventRequest('checkout.session.async_payment_failed', 'unpaid'))).json()).toMatchObject({ status: 'failed' });
});

test('replayed test events are harmless, ignored events are acknowledged, oversized bodies are rejected', async () => {
  for (let i = 0; i < 2; i++) expect((await POST(eventRequest('checkout.session.completed'))).status).toBe(200);
  expect(await (await POST(eventRequest('customer.created'))).json()).toEqual({ received: true });
  expect((await POST(new Request('http://localhost/api/stripe/webhook/', { method: 'POST', body: 'x'.repeat(256_001), headers: { 'stripe-signature': 'forged' } }))).status).toBe(413);
});
