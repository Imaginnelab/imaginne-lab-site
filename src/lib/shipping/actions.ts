'use server';

import { getCurrentUser } from '@/lib/dal';
import { getCartProducts } from '@/lib/products/queries';
import { prepareCheckoutCart } from '@/lib/checkout/cart';
import { canadaPostSettings } from './config';
import { estimateParcel } from './parcel';
import { getCanadaPostRates } from './canada-post';
import { shippingQuoteSchema, type ShippingQuoteResult } from './schema';

export async function quoteShipping(input: unknown): Promise<ShippingQuoteResult> {
  const parsed = shippingQuoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalidPostalCode' };
  try {
    // Resolve the cookie identity; the carrier's Rating call is read-only and is
    // available to visitors. Checkout creation still requires an authenticated user.
    await getCurrentUser();
    const settings = canadaPostSettings();
    if (!settings) return { ok: false, error: 'configuration' };
    const { locale, lines, postalCode } = parsed.data;
    const result = await getCartProducts({ locale, ids: [...new Set(lines.map((line) => line.id))] });
    if (!result.ok || !prepareCheckoutCart(lines, result.products, locale).ok) return { ok: false, error: 'products' };
    const packed = estimateParcel(lines, result.products, settings.paddingCm, settings.packagingGrams);
    if (!packed.ok) return packed;
    const rates = await getCanadaPostRates(settings, postalCode, packed.parcel);
    return rates.length ? { ok: true, rates, parcel: packed.parcel } : { ok: false, error: 'noServices' };
  } catch { return { ok: false, error: 'providerUnavailable' }; }
}
