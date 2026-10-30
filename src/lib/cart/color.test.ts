import { expect, test } from 'vitest';
import { cartColor } from './color';
import type { ProductColorOption } from '@/lib/products/colors';

const colors: ProductColorOption[] = [
  { id: '30000000-0000-4000-8000-000000000001', name: 'Rosa', hex: '#FFC0CB', locale: 'pt' },
  { id: '30000000-0000-4000-8000-000000000002', name: 'Pink', hex: '#FFC0CB', locale: 'en' },
  { id: '30000000-0000-4000-8000-000000000003', name: 'Sem tom', hex: null, locale: 'pt' },
];
test('cart colours come from the selected product row and use a translated name for the same HEX', () => {
  expect(cartColor(colors, colors[0].id, 'en')).toEqual(colors[1]);
  expect(cartColor(colors, colors[0].id, 'es')).toEqual(colors[0]);
  expect(cartColor(colors, colors[2].id, 'en')).toEqual(colors[2]);
  expect(cartColor(colors, '30000000-0000-4000-8000-000000000099', 'pt')).toBeNull();
  expect(cartColor([], colors[0].id, 'pt')).toBeNull();
});
