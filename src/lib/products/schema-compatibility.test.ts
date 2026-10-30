import { expect, test } from 'vitest';
import { missingProductSpecifications } from './schema-compatibility';
import { localizedProductColors, orderedLocalizedProductColors, productColorsSchema } from './colors';

test('fallback is restricted to missing optional columns, never authorization, network or unrelated schema errors', () => {
  expect(missingProductSpecifications({ code: '42703', message: 'column products.category_pt does not exist' })).toBe(true);
  expect(missingProductSpecifications({ code: 'PGRST204', message: "Could not find the 'stock_quantity' column in the schema cache" })).toBe(true);
  for (const error of [null, { code: '42501', message: 'permission denied for category_pt' }, { code: '503', message: 'category_pt unavailable' },
    { code: '42703', message: 'column created_by does not exist' }]) expect(missingProductSpecifications(error)).toBe(false);
});
test('colour rows select one language in display order, with a Portuguese fallback and strict hexadecimal swatches', () => {
  const rows = [{ id: '30000000-0000-4000-8000-000000000001', name: 'Branco', hex: '#ffffff', locale: 'pt', sort_order: 1 }, { id: '30000000-0000-4000-8000-000000000002', name: 'Rosa', hex: null, locale: 'pt', sort_order: 0 },
    { id: '30000000-0000-4000-8000-000000000003', name: 'Pink', hex: null, locale: 'en', sort_order: 0 }];
  expect(localizedProductColors(rows, 'pt')).toMatchObject([
    { name: 'Rosa', hex: null }, { name: 'Branco', hex: '#FFFFFF' },
  ]);
  expect(localizedProductColors(rows, 'en')).toMatchObject([{ id: rows[2].id, name: 'Pink', hex: null }]);
  expect(localizedProductColors(rows, 'es')).toEqual(localizedProductColors(rows, 'pt'));
  expect(orderedLocalizedProductColors()).toEqual([]);
  expect(orderedLocalizedProductColors([{ name: 'Teste', hex: 'url(evil)', locale: 'pt', sort_order: 0 }])).toEqual([]);
});

test('colour inputs require a supported locale and allow twenty distinct names per language', () => {
  expect(productColorsSchema.parse([{ name: ' Verde ', hex: '#556b2f', locale: 'pt' }, { name: 'Verde', hex: null, locale: 'es' }])).toEqual([
    { name: 'Verde', hex: '#556B2F', locale: 'pt' }, { name: 'Verde', hex: null, locale: 'es' },
  ]);
  for (const input of ['Verde, Branco', [{ name: '', hex: null, locale: 'pt' }], [{ name: 'X', hex: '#FFF', locale: 'pt' }],
    [{ name: 'X', hex: null, product_id: 'another-product', locale: 'pt' }], [{ name: 'X', hex: null, locale: 'fr' }], [{ name: 'X', hex: null }],
    [{ name: 'Verde', hex: null, locale: 'pt' }, { name: 'verde', hex: null, locale: 'pt' }],
    Array.from({ length: 21 }, (_, i) => ({ name: String(i), hex: null, locale: 'pt' }))]) {
    expect(productColorsSchema.safeParse(input).success).toBe(false);
  }
  expect(productColorsSchema.safeParse(['pt', 'en', 'es'].flatMap((locale) => Array.from({ length: 20 }, (_, i) => ({ name: String(i), hex: null, locale })))).success).toBe(true);
});
