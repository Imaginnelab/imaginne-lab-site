import { expect, test } from 'vitest';
import { prepareCheckoutCart } from './cart';
import { checkoutSchema } from './schema';
import type { CartProductDTO } from '@/lib/products/types';

const id = '10000000-0000-4000-8000-000000000001';
const colorId = '30000000-0000-4000-8000-000000000001';
const secondColor = '30000000-0000-4000-8000-000000000002';
const product: CartProductDTO = { id, name: 'Vaso', description: 'Peça', price: '$49.90', priceCents: 4990,
  photos: ['/vase.jpg'], modelUrl: null, modelBytes: null, featured: false, stockQuantity: 8,
  colors: [{ id: colorId, name: 'Rosa', hex: '#FFC0CB', locale: 'pt' }, { id: secondColor, name: 'Branco', hex: '#FFFFFF', locale: 'pt' }] };

test('computes every amount from the catalogue and keeps selected colour IDs', () => {
  const result = prepareCheckoutCart([{ id, colorId, quantity: 2 }], [product], 'pt');
  expect(result).toMatchObject({ ok: true, subtotalCents: 9980, lines: [{ unitAmount: 4990, colorId, colorName: 'Rosa' }] });
});

test('adds quantities across colours before comparing product stock', () => {
  expect(prepareCheckoutCart([{ id, colorId, quantity: 5 }, { id, colorId: secondColor, quantity: 4 }], [product], 'pt')).toEqual({ ok: false, error: 'stock' });
});

test('rejects missing products, quotes, invalid prices, removed colours and missing selections', () => {
  const line = [{ id, colorId, quantity: 1 }];
  expect(prepareCheckoutCart(line, [], 'pt')).toMatchObject({ error: 'productUnavailable' });
  for (const priceCents of [null, -1, 0, 2.5, NaN]) expect(prepareCheckoutCart(line, [{ ...product, priceCents }], 'pt')).toMatchObject({ error: 'productUnavailable' });
  expect(prepareCheckoutCart([{ id, quantity: 1 }], [product], 'pt')).toMatchObject({ error: 'colorUnavailable' });
  expect(prepareCheckoutCart(line, [{ ...product, colors: [] }], 'pt')).toMatchObject({ error: 'colorUnavailable' });
  expect(prepareCheckoutCart(line, [{ ...product, stockQuantity: 0 }], 'pt')).toMatchObject({ error: 'stock' });
});

test('unknown stock allows made-to-order pieces but amounts remain bounded', () => {
  expect(prepareCheckoutCart([{ id, colorId, quantity: 9 }], [{ ...product, stockQuantity: null }], 'pt').ok).toBe(true);
  expect(prepareCheckoutCart([{ id, colorId, quantity: 9 }], [{ ...product, stockQuantity: null, priceCents: 100_000_000 }], 'pt')).toMatchObject({ error: 'invalid' });
});

test('input rejects forged prices, duplicate lines, empty carts and oversized quantities', () => {
  const input = { locale: 'pt', lines: [{ id, colorId, quantity: 1 }], subtotalCents: 4990, requestId: '40000000-0000-4000-8000-000000000001' };
  expect(checkoutSchema.safeParse(input).success).toBe(true);
  for (const lines of [[], [{ id, colorId, quantity: 100 }], [{ id, quantity: 1, price: 1 }], [input.lines[0], input.lines[0]]]) {
    expect(checkoutSchema.safeParse({ ...input, lines }).success).toBe(false);
  }
});
