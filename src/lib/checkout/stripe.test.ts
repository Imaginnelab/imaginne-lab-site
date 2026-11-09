import { afterEach, expect, test, vi } from 'vitest';
import { checkoutSettings, validCheckoutUrl } from './stripe';

afterEach(() => vi.unstubAllEnvs());
function configure() {
  vi.stubEnv('STRIPE_CHECKOUT_ENABLED', 'true'); vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_isolated');
  vi.stubEnv('CHECKOUT_SITE_URL', 'http://localhost:3000'); vi.stubEnv('VERCEL', ''); vi.stubEnv('VERCEL_ENV', '');
}

test('only local test keys can configure checkout', () => {
  configure();
  expect(checkoutSettings()).toMatchObject({ origin: 'http://localhost:3000', taxEnabled: false });
  for (const key of ['sk_live_placeholder', 'rk_live_placeholder', '', 'pk_test_placeholder']) {
    vi.stubEnv('STRIPE_SECRET_KEY', key); expect(checkoutSettings()).toBeNull();
  }
});

test('deployed environments and external or credential-bearing origins stay disabled', () => {
  configure(); vi.stubEnv('VERCEL', '1'); expect(checkoutSettings()).toBeNull();
  vi.stubEnv('VERCEL', ''); vi.stubEnv('VERCEL_ENV', 'production'); expect(checkoutSettings()).toBeNull();
  vi.stubEnv('VERCEL_ENV', '');
  for (const origin of ['https://www.imaginnelab.com', 'https://attacker.test', 'http://name:pass@localhost:3000', 'http://localhost:3000/path', 'http://localhost:3000/?next=x']) {
    vi.stubEnv('CHECKOUT_SITE_URL', origin); expect(checkoutSettings()).toBeNull();
  }
});

test('only the Stripe hosted checkout can be a payment redirect outside isolated browser tests', () => {
  vi.stubEnv('IMAGINNE_STORE_TEST', '');
  expect(validCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_example')).toBe(true);
  for (const url of [null, 'javascript:alert(1)', 'https://checkout.stripe.com.attacker.test/', 'http://checkout.stripe.com/', 'http://localhost:4312/checkout/x']) expect(validCheckoutUrl(url)).toBe(false);
});
