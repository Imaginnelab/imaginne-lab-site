import type { Locale } from '@/i18n/config';
import type { CartLine } from '@/lib/cart/state';
import { cartColor } from '@/lib/cart/color';
import type { CartProductDTO } from '@/lib/products/types';
import { MAX_CHECKOUT_CENTS, type CheckoutError } from './schema';

export type CheckoutLine = CartLine & { name: string; colorName: string | null; unitAmount: number; photo: string };
type PreparedCart = { ok: true; lines: CheckoutLine[]; subtotalCents: number } | { ok: false; error: CheckoutError };

// The database supplies every amount and option. The browser supplies only IDs and quantities.
// Stock belongs to a product, so quantities in different colours must be added together.
export function prepareCheckoutCart(lines: CartLine[], products: CartProductDTO[], locale: Locale): PreparedCart {
  if (!lines.length) return { ok: false, error: 'invalid' };
  const byId = new Map(products.map((product) => [product.id, product]));
  const quantities = new Map<string, number>();
  for (const line of lines) quantities.set(line.id, (quantities.get(line.id) ?? 0) + line.quantity);
  const prepared: CheckoutLine[] = [];
  let subtotalCents = 0;
  for (const line of lines) {
    const product = byId.get(line.id);
    if (!product || product.priceCents === null || !Number.isSafeInteger(product.priceCents) || product.priceCents < 1) {
      return { ok: false, error: 'productUnavailable' };
    }
    const color = cartColor(product.colors, line.colorId, locale);
    if ((line.colorId && !color) || (!line.colorId && product.colors.length)) return { ok: false, error: 'colorUnavailable' };
    if (product.stockQuantity !== null && (!Number.isInteger(product.stockQuantity) || product.stockQuantity < quantities.get(line.id)!)) {
      return { ok: false, error: 'stock' };
    }
    subtotalCents += product.priceCents * line.quantity;
    prepared.push({ ...line, name: product.name, colorName: color?.name ?? null, unitAmount: product.priceCents, photo: product.photos[0] });
  }
  return subtotalCents > MAX_CHECKOUT_CENTS ? { ok: false, error: 'invalid' } : { ok: true, lines: prepared, subtotalCents };
}
