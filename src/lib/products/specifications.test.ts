import { expect, test } from 'vitest';
import { productSpecificationsSchema } from './specifications-schema';
import { localized } from './format';

test('legacy products have empty optional specifications and unknown stock', () => {
  const empty = productSpecificationsSchema.parse({});
  expect(empty.category_pt).toBe('');
  expect(empty.width_cm).toBeNull();
  expect(empty.stock_quantity).toBeNull();
  expect(productSpecificationsSchema.parse({ stock_quantity: 0 }).stock_quantity).toBe(0);
});
test('specifications validate text limits, dimensions, weight and whole stock without coercing browser values', () => {
  for (const input of [{ category_en: 'x'.repeat(121) }, { material_pt: 20 }, { care_es: 'x'.repeat(1201) },
    { width_cm: 0 }, { width_cm: 12.345 }, { height_cm: -1 }, { depth_cm: Infinity }, { weight_g: NaN }, { weight_g: 10_000_001 },
    { stock_quantity: 1.5 }, { stock_quantity: -1 }, { stock_quantity: '3' }, { stock_quantity: 1_000_001 }]) {
    expect(productSpecificationsSchema.safeParse(input).success).toBe(false);
  }
  expect(productSpecificationsSchema.parse({ category_pt: '  Vasos  ', width_cm: 10.5, weight_g: 125.5, stock_quantity: 10 }))
    .toMatchObject({ category_pt: 'Vasos', width_cm: 10.5, weight_g: 125.5, stock_quantity: 10 });
});
test('additional texts select the current language and use the existing Portuguese fallback', () => {
  const row = { material_pt: 'Plástico', material_en: 'Plastic', material_es: 'Plástico ES' };
  expect(localized(row, 'material', 'en')).toBe('Plastic');
  expect(localized(row, 'material', 'es')).toBe('Plástico ES');
  expect(localized({ ...row, material_en: '' }, 'material', 'en')).toBe('Plástico');
  expect(localized(row, 'created_by', 'en')).toBe('');
});
