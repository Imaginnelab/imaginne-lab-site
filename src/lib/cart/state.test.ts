import { expect, test } from 'vitest';
import { addLine, parseCart, setLineQuantity } from './state';
import { MAX_CART_ITEMS, MAX_CART_QUANTITY } from '@/lib/products/input';

const id = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
test('stored cart data cannot supply prices, invalid IDs, duplicate lines or unbounded quantities', () => {
  for (const value of [null, '{', '{}', JSON.stringify([{ id, quantity: 1, price: 1 }]),
    JSON.stringify([{ id: '<script>', quantity: 1 }]), JSON.stringify([{ id, quantity: -1 }]),
    JSON.stringify([{ id, quantity: 1.5 }]), JSON.stringify([{ id, quantity: 100 }]),
    JSON.stringify([{ id, quantity: 1 }, { id, quantity: 2 }]), 'x'.repeat(10_001)]) {
    expect(parseCart(value)).toEqual([]);
  }
  expect(parseCart(JSON.stringify([{ id, quantity: 2 }]))).toEqual([{ id, quantity: 2 }]);
});
test('adding merges the existing line and caps its quantity; a full cart cannot grow', () => {
  const initial = [{ id, quantity: 2 }];
  expect(addLine(initial, id, 3)).toEqual([{ id, quantity: 5 }]);
  expect(addLine(initial, id, 99)).toEqual([{ id, quantity: MAX_CART_QUANTITY }]);
  expect(addLine(initial, other, 1)).toEqual([...initial, { id: other, quantity: 1 }]);
  expect(initial).toEqual([{ id, quantity: 2 }]);
  const full = Array.from({ length: MAX_CART_ITEMS }, (_, i) => ({ id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, quantity: 1 }));
  expect(addLine(full, '20000000-0000-4000-8000-000000000001', 1)).toBe(full);
  expect(addLine(full, id, 1)[0].quantity).toBe(2);
});
test('quantity changes and removal preserve other lines and reject invalid input', () => {
  const initial = [{ id, quantity: 2 }, { id: other, quantity: 1 }];
  expect(setLineQuantity(initial, id, 5)).toEqual([{ id, quantity: 5 }, initial[1]]);
  expect(setLineQuantity(initial, id, 0)).toEqual([initial[1]]);
  for (const quantity of [-1, NaN, Infinity, 1.5, 100]) expect(setLineQuantity(initial, id, quantity)).toBe(initial);
  for (const quantity of [0, -1, 1.5, 100]) expect(addLine(initial, id, quantity)).toBe(initial);
});

test('colours of the same product form distinct lines and persist only their IDs', () => {
  const pink = '30000000-0000-4000-8000-000000000001', white = '30000000-0000-4000-8000-000000000002';
  const one = addLine([], id, 2, pink);
  const two = addLine(one, id, 1, white);
  expect(two).toEqual([{ id, colorId: pink, quantity: 2 }, { id, colorId: white, quantity: 1 }]);
  expect(addLine(two, id, 3, pink)).toEqual([{ id, colorId: pink, quantity: 5 }, two[1]]);
  expect(setLineQuantity(two, id, 4, white)).toEqual([one[0], { id, colorId: white, quantity: 4 }]);
  expect(setLineQuantity(two, id, 0, pink)).toEqual([two[1]]);
  expect(parseCart(JSON.stringify(two))).toEqual(two);
  expect(parseCart(JSON.stringify([one[0], one[0]]))).toEqual([]);
  expect(addLine(two, id, 1, 'forged')).toBe(two);
});
