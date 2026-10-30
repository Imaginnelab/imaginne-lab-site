import { z } from 'zod';
import type { Locale } from '@/i18n/config';

export const MAX_PRODUCT_COLORS = 20;
export const MAX_COLOR_NAME = 120;
export const productColorSchema = z.strictObject({
  name: z.string().trim().min(1).max(MAX_COLOR_NAME).regex(/^[^\x00-\x1f\x7f]+$/),
  hex: z.string().regex(/^#[0-9a-f]{6}$/i).transform((value) => value.toUpperCase()).nullable(),
});
export type ProductColor = z.output<typeof productColorSchema>;
const localizedColorSchema = productColorSchema.extend({ locale: z.enum(['pt', 'en', 'es']) });
export type LocalizedProductColor = z.output<typeof localizedColorSchema>;
export type ProductColorOption = LocalizedProductColor & { id: string };
export const productColorsSchema = z.array(localizedColorSchema).max(MAX_PRODUCT_COLORS * 3).superRefine((colors, context) => {
  const seen = new Set<string>(), counts = { pt: 0, en: 0, es: 0 };
  colors.forEach((color, index) => {
    const key = color.locale + ':' + color.name.toLowerCase();
    if (seen.has(key) || ++counts[color.locale] > MAX_PRODUCT_COLORS) context.addIssue({ code: 'custom', path: [index, 'name'], message: 'Duplicate colour or language limit exceeded' });
    seen.add(key);
  });
});

// PostgREST returns child rows without a guaranteed order unless requested explicitly.
export function orderedLocalizedProductColors(rows: unknown = []): LocalizedProductColor[] {
  const parsed = z.array(z.object({ ...localizedColorSchema.shape, sort_order: z.number().int() })).safeParse(rows);
  if (!parsed.success) return [];
  return parsed.data.sort((a, b) => a.locale.localeCompare(b.locale) || a.sort_order - b.sort_order)
    .map(({ name, hex, locale }) => ({ name, hex, locale }));
}

// As with basic optional translations, a missing list falls back to Portuguese as a whole.
export function productColorOptions(rows: unknown = []): ProductColorOption[] {
  const parsed = z.array(z.object({ ...localizedColorSchema.shape, id: z.uuid(), sort_order: z.number().int() })).safeParse(rows);
  if (!parsed.success) return [];
  return parsed.data.sort((a, b) => a.locale.localeCompare(b.locale) || a.sort_order - b.sort_order)
    .map(({ id, name, hex, locale }) => ({ id, name, hex, locale }));
}

export function localizedProductColors(rows: unknown, locale: Locale): ProductColorOption[] {
  const all = productColorOptions(rows);
  const selected = all.filter((color) => color.locale === locale);
  return selected.length ? selected : all.filter((color) => color.locale === 'pt');
}
