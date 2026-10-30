import type { Locale } from '@/i18n/config';
import type { ProductColorOption } from '@/lib/products/colors';

// Resolve only rows returned for this product. Storage supplies an ID, never a colour name.
export function cartColor(colors: ProductColorOption[], colorId: string | null | undefined, locale: Locale): ProductColorOption | null {
  const selected = colors.find((color) => color.id === colorId);
  if (!selected) return null;
  return selected.hex ? colors.find((color) => color.locale === locale && color.hex === selected.hex) ?? selected : selected;
}
