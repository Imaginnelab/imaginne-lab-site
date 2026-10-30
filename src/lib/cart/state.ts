import { cartSchema, MAX_CART_ITEMS, MAX_CART_QUANTITY, productIdSchema } from '@/lib/products/input';

export type CartLine = { id: string; quantity: number; colorId?: string | null };
export const CART_KEY = 'imaginne-cart-v1';
export const cartLineKey = (line: Pick<CartLine, 'id' | 'colorId'>) => line.id + ':' + (line.colorId ?? '');

// Browser storage is untrusted and contains no names, prices, session or customer data.
export function parseCart(raw: string | null): CartLine[] {
  if (!raw || raw.length > 10_000) return [];
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch { return []; }
}

export function addLine(lines: CartLine[], id: string, quantity: number, colorId: string | null = null): CartLine[] {
  if (!productIdSchema.safeParse(id).success || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) return lines;
  if (colorId !== null && !productIdSchema.safeParse(colorId).success) return lines;
  const key = cartLineKey({ id, colorId });
  const existing = lines.find((line) => cartLineKey(line) === key);
  if (existing) return lines.map((line) => cartLineKey(line) === key ? { ...line, quantity: Math.min(MAX_CART_QUANTITY, line.quantity + quantity) } : line);
  return lines.length < MAX_CART_ITEMS ? [...lines, { id, quantity, ...(colorId ? { colorId } : {}) }] : lines;
}

export function setLineQuantity(lines: CartLine[], id: string, quantity: number, colorId: string | null = null): CartLine[] {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_CART_QUANTITY) return lines;
  const key = cartLineKey({ id, colorId });
  return quantity === 0 ? lines.filter((line) => cartLineKey(line) !== key) : lines.map((line) => cartLineKey(line) === key ? { ...line, quantity } : line);
}
