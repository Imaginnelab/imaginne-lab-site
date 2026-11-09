'use server';

import { createHash } from 'node:crypto';
import { getCurrentUser } from '@/lib/dal';
import { getCartProducts } from '@/lib/products/queries';
import { localePath } from '@/i18n/config';
import { checkoutSchema, type CheckoutResult } from './schema';
import { prepareCheckoutCart } from './cart';
import { checkoutSettings, stripeClient, validCheckoutUrl, CHECKOUT_SOURCE, INTEGRATION_IDENTIFIER } from './stripe';

export async function createCheckout(input: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: 'signIn' };
    const settings = checkoutSettings();
    if (!settings) return { ok: false, error: 'configuration' };
    const { locale, lines, subtotalCents, requestId } = parsed.data;
    const products = await getCartProducts({ locale, ids: [...new Set(lines.map((line) => line.id))] });
    if (!products.ok) return { ok: false, error: 'unavailable' };
    const cart = prepareCheckoutCart(lines, products.products, locale);
    if (!cart.ok) return cart;
    if (cart.subtotalCents !== subtotalCents) return { ok: false, error: 'priceChanged' };
    const stripe = stripeClient(settings);
    if (settings.taxEnabled) {
      // Do not silently collect zero because Tax was enabled without a registration.
      const [tax, registrations] = await Promise.all([
        stripe.tax.settings.retrieve(), stripe.tax.registrations.list({ status: 'active', limit: 100 }),
      ]);
      if (tax.status !== 'active' || !registrations.data.some((registration) => registration.country === 'CA' && registration.status === 'active')) {
        return { ok: false, error: 'taxConfiguration' };
      }
    }
    const params = {
      mode: 'payment' as const,
      locale: { en: 'en' as const, pt: 'pt-BR' as const, es: 'es' as const }[locale],
      client_reference_id: user.id,
      ...(user.email ? { customer_email: user.email } : {}),
      integration_identifier: INTEGRATION_IDENTIFIER,
      metadata: { source: CHECKOUT_SOURCE, order_preview: cart.lines[0].name.slice(0, 250),
        order_quantity: String(cart.lines.reduce((sum, line) => sum + line.quantity, 0)),
        ...(cart.lines[0].photo.length <= 500 ? { order_image: cart.lines[0].photo } : {}) },
      payment_intent_data: { metadata: { source: CHECKOUT_SOURCE, user_id: user.id } },
      adaptive_pricing: { enabled: false },
      automatic_tax: { enabled: settings.taxEnabled },
      billing_address_collection: 'required' as const,
      shipping_address_collection: { allowed_countries: ['CA' as const] },
      shipping_options: [{ shipping_rate_data: {
        type: 'fixed_amount' as const, fixed_amount: { amount: settings.shippingCents, currency: 'cad' },
        display_name: { en: 'Simulated test shipping', pt: 'Frete de teste simulado', es: 'Envío de prueba simulado' }[locale],
        tax_behavior: 'exclusive' as const,
      } }],
      success_url: settings.origin + localePath(locale, '/checkout/result') + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: settings.origin + localePath(locale, '/checkout') + '?canceled=1',
      line_items: cart.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: 'cad', unit_amount: line.unitAmount, tax_behavior: 'exclusive' as const,
          product_data: { name: (line.name + (line.colorName ? ' · ' + line.colorName : '')).slice(0, 250),
            ...(line.photo.startsWith('https://') ? { images: [line.photo] } : {}),
            metadata: { product_id: line.id, color_id: line.colorId ?? '', ...(line.photo.length <= 500 ? { product_image: line.photo } : {}) } },
        },
      })),
    };
    // A retry of the same attempt and server-validated snapshot reuses its Stripe Session.
    const digest = createHash('sha256').update(JSON.stringify({ user: user.id, requestId, params })).digest('hex');
    const session = await stripe.checkout.sessions.create(params, { idempotencyKey: 'checkout-test-' + digest });
    if (session.livemode || !validCheckoutUrl(session.url)) return { ok: false, error: 'unavailable' };
    return { ok: true, url: session.url };
  } catch { return { ok: false, error: 'unavailable' }; }
}
