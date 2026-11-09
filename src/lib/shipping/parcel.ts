import type { CartLine } from '@/lib/cart/state';
import type { CartProductDTO } from '@/lib/products/types';
import type { Parcel, ShippingError } from './schema';

// Conservative bounding-box estimate: pieces are rotated and placed next to the
// occupied box, never intersected or assumed to nest inside each other. Actual
// packaging is selected after packing; no standard box is assumed.
export function estimateParcel(lines: CartLine[], products: CartProductDTO[], paddingCm: number, packagingGrams: number): { ok: true; parcel: Parcel } | { ok: false; error: ShippingError } {
  const byId = new Map(products.map((product) => [product.id, product]));
  const pieces: number[][] = [];
  let weightGrams = packagingGrams;
  for (const line of lines) {
    const product = byId.get(line.id);
    if (!product) return { ok: false, error: 'products' };
    const size = [product.widthCm, product.heightCm, product.depthCm];
    if (size.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value <= 0) || typeof product.weightGrams !== 'number' || !Number.isFinite(product.weightGrams) || product.weightGrams <= 0) {
      return { ok: false, error: 'missingMeasurements' };
    }
    if (pieces.length + line.quantity > 200) return { ok: false, error: 'parcelTooLarge' };
    for (let i = 0; i < line.quantity; i++) pieces.push(size as number[]);
    weightGrams += product.weightGrams * line.quantity;
  }
  if (!pieces.length || weightGrams <= 0 || weightGrams > 99_999) return { ok: false, error: 'parcelTooLarge' };
  pieces.sort((a, b) => Math.max(...b) - Math.max(...a));
  let box = [0, 0, 0];
  for (const [a, b, c] of pieces) {
    const orientations = [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];
    const candidates = orientations.flatMap((piece) => [0, 1, 2].map((axis) => box.map((edge, index) => index === axis ? edge + piece[index] : Math.max(edge, piece[index]))));
    candidates.sort((x, y) => (x[0] * x[1] * x[2] - y[0] * y[1] * y[2]) || (Math.max(...x) - Math.max(...y)));
    box = candidates[0];
  }
  const [lengthCm, widthCm, heightCm] = box.map((edge) => Math.ceil((edge + paddingCm * 2) * 10) / 10).sort((a, b) => b - a);
  if (lengthCm > 999.9) return { ok: false, error: 'parcelTooLarge' };
  return { ok: true, parcel: { lengthCm, widthCm, heightCm, weightKg: Math.ceil(weightGrams) / 1000 } };
}
