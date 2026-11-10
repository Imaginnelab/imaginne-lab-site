import 'server-only';
import Stripe from 'stripe';

export { CHECKOUT_SOURCE, INTEGRATION_IDENTIFIER } from './constants';

export function checkoutSettings() {
  // Test mode only, locally or on the deployed site. A live key cannot enable it.
  if (process.env.STRIPE_CHECKOUT_ENABLED !== 'true') return null;
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  if (!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(key)) return null;
  try {
    const url = new URL(process.env.CHECKOUT_SITE_URL ?? 'http://localhost:3000');
    // Plain http only for a local server; the deployed site must be https.
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (!(url.protocol === 'https:' || (local && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    const shippingCents = Number(process.env.STRIPE_TEST_SHIPPING_CENTS ?? '0');
    if (!Number.isSafeInteger(shippingCents) || shippingCents < 0 || shippingCents > 100_000) return null;
    return { key, origin: url.origin, shippingCents, taxEnabled: process.env.STRIPE_TAX_ENABLED === 'true' };
  } catch { return null; }
}

export function isolatedCheckoutBackend(): boolean {
  return process.env.IMAGINNE_STORE_TEST === '1' && process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production'
    && process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://127.0.0.1:4312';
}

export function stripeClient(settings: NonNullable<ReturnType<typeof checkoutSettings>>) {
  return new Stripe(settings.key, {
    maxNetworkRetries: 2, timeout: 15_000,
    ...(isolatedCheckoutBackend() ? { host: '127.0.0.1', port: 4312, protocol: 'http' as const } : {}),
  });
}

export function validCheckoutUrl(raw: string | null): raw is string {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return (url.protocol === 'https:' && url.hostname === 'checkout.stripe.com' && !url.username && !url.password)
      || (isolatedCheckoutBackend() && url.origin === 'http://localhost:4312' && url.pathname.startsWith('/checkout/'));
  } catch { return false; }
}
