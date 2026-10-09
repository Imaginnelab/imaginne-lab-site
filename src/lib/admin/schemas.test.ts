import assert from 'node:assert/strict';
import { test } from 'vitest';
import { couponSchema, idSchema, listSchema, productSchema } from './schemas';

const product = {
  name_pt: 'Vaso', name_en: 'Vase', name_es: 'Jarrón',
  description_pt: 'Feito sob encomenda', description_en: 'Made to order', description_es: 'Hecho a pedido',
  price_cad_cents: 4990, image_path: '0b1c2d3e-0000-4000-8000-000000000001.webp', extra_image_paths: ['extra-1.webp', 'dir/extra-2.png'],
  model_path: 'leao.glb', model_bytes: 1258868, is_active: true, sort_order: 3,
};
const coupon = {
  code: 'VERAO10', discount_type: 'percent', percent_off: 10, amount_off_cad_cents: null,
  starts_at: null, expires_at: null, max_uses: null, is_active: true,
};
const okProduct = (change: object = {}) => productSchema.safeParse({ ...product, ...change }).success;
const okCoupon = (change: object = {}) => couponSchema.safeParse({ ...coupon, ...change }).success;

test('a complete product passes and comes out trimmed', () => {
  const parsed = productSchema.parse({ ...product, name_pt: '  Vaso  ' });
  assert.equal(parsed.name_pt, 'Vaso');
  assert.deepEqual(Object.keys(parsed).sort(), Object.keys(product).sort());
  assert.ok(okProduct({ price_cad_cents: null }));
  assert.ok(okProduct({ price_cad_cents: 0 }));
  assert.ok(okProduct({ price_cad_cents: 100_000_000 }));
  assert.ok(okProduct({ extra_image_paths: [] }));
  assert.ok(okProduct({ model_path: null, model_bytes: null }));
  assert.ok(okProduct({ model_bytes: null }));
  assert.ok(okProduct({ sort_order: -100_000 }));
  assert.ok(okProduct({ sort_order: 100_000 }));
  assert.ok(okProduct({ name_en: 'x'.repeat(120), description_en: 'y'.repeat(600) }));
});

test('product texts respect the limits of the database', () => {
  for (const field of ['name_pt', 'name_en', 'name_es']) {
    assert.equal(okProduct({ [field]: '' }), false, field);
    assert.equal(okProduct({ [field]: '   ' }), false, field);
    assert.equal(okProduct({ [field]: 'x'.repeat(121) }), false, field);
    assert.equal(okProduct({ [field]: 5 }), false, field);
  }
  for (const field of ['description_pt', 'description_en', 'description_es']) {
    assert.equal(okProduct({ [field]: ' ' }), false, field);
    assert.equal(okProduct({ [field]: 'y'.repeat(601) }), false, field);
  }
});

test('price and order are whole numbers inside their ranges', () => {
  for (const price of [-1, 100_000_001, 49.9, '4990', NaN, Infinity, undefined]) assert.equal(okProduct({ price_cad_cents: price }), false, String(price));
  for (const order of [-100_001, 100_001, 1.5, '1', null]) assert.equal(okProduct({ sort_order: order }), false, String(order));
  assert.equal(okProduct({ is_active: 'true' }), false);
});

test('photo paths are object paths, never URLs or ways out of the bucket', () => {
  for (const path of ['https://evil.example/x.png', '//evil.example/x.png', '/x.png', '../x.png', 'a/../b.png', 'a..b.png', '.hidden.png',
    'com espaço.png', 'x.png?download=1', 'x.png#a', 'a\\b.png', '', 'x'.repeat(201), null, 7]) {
    assert.equal(okProduct({ image_path: path }), false, String(path));
    assert.equal(okProduct({ extra_image_paths: [path] }), false, String(path));
  }
  assert.ok(okProduct({ image_path: 'x'.repeat(200) }));
  assert.equal(okProduct({ extra_image_paths: ['1', '2', '3', '4', '5', '6'] }), false);
  assert.ok(okProduct({ extra_image_paths: ['1', '2', '3', '4', '5'] }));
  // The same file twice, or the cover again among the extras.
  assert.equal(okProduct({ extra_image_paths: ['a.png', 'a.png'] }), false);
  assert.equal(okProduct({ extra_image_paths: [product.image_path] }), false);
  assert.equal(okProduct({ extra_image_paths: 'a.png' }), false);
});

test('the model is a .glb path with a size inside the bucket limit', () => {
  for (const path of ['leao.gltf', 'leao.glb.exe', 'leao.GLB', 'glb', '../leao.glb', 'a/../leao.glb', 'https://evil.example/leao.glb', `${'x'.repeat(197)}.glb`, '']) {
    assert.equal(okProduct({ model_path: path }), false, path);
  }
  assert.ok(okProduct({ model_path: `${'x'.repeat(196)}.glb` }));
  for (const bytes of [0, -1, 15_728_641, 1.5, '100']) assert.equal(okProduct({ model_bytes: bytes }), false, String(bytes));
  assert.ok(okProduct({ model_bytes: 15_728_640 }));
  // A size without a model is refused.
  assert.equal(okProduct({ model_path: null }), false);
});

test('fields the administrator may not set are refused, not ignored', () => {
  for (const extra of [{ view_count: 999999 }, { id: '0b1c2d3e-0000-4000-8000-000000000001' }, { created_by: 'x' }, { created_at: 'now' }, { updated_at: 'now' }, { is_admin: true }]) {
    assert.equal(okProduct(extra), false, JSON.stringify(extra));
  }
  for (const extra of [{ used_count: 0 }, { id: 'x' }, { created_by: 'x' }, { updated_at: 'now' }]) assert.equal(okCoupon(extra), false, JSON.stringify(extra));
  // A missing field is not filled in silently either.
  const { is_active: _removed, ...partial } = product;
  void _removed;
  assert.equal(productSchema.safeParse(partial).success, false);
});

test('coupon codes follow the pattern of the database', () => {
  for (const code of ['ABC', 'VERAO10', 'A1_B-2', '9LIVES', 'A'.repeat(32)]) assert.ok(okCoupon({ code }), code);
  for (const code of ['AB', '-ABC', '_ABC', 'verao10', 'AB C', 'AÇÃO', 'A'.repeat(33), 'AB%', '', ' ABC', null]) assert.equal(okCoupon({ code }), false, String(code));
});

test('a coupon carries exactly one kind of discount, with its value', () => {
  assert.ok(okCoupon({ percent_off: 1 }));
  assert.ok(okCoupon({ percent_off: 100 }));
  assert.ok(okCoupon({ discount_type: 'amount', percent_off: null, amount_off_cad_cents: 1 }));
  assert.ok(okCoupon({ discount_type: 'amount', percent_off: null, amount_off_cad_cents: 100_000_000 }));
  // Found in review of the migration: a discount of one kind with no value must not pass.
  assert.equal(okCoupon({ percent_off: null }), false);
  assert.equal(okCoupon({ discount_type: 'amount', percent_off: null, amount_off_cad_cents: null }), false);
  assert.equal(okCoupon({ amount_off_cad_cents: 500 }), false);
  assert.equal(okCoupon({ discount_type: 'amount', amount_off_cad_cents: 500 }), false);
  for (const percent of [0, 101, 10.5, -5, '10']) assert.equal(okCoupon({ percent_off: percent }), false, String(percent));
  for (const amount of [0, -1, 100_000_001, 9.99]) assert.equal(okCoupon({ discount_type: 'amount', percent_off: null, amount_off_cad_cents: amount }), false, String(amount));
  assert.equal(okCoupon({ discount_type: 'free' }), false);
});

test('coupon period and usage limit', () => {
  assert.ok(okCoupon({ starts_at: '2026-11-01T09:00:00.000Z', expires_at: '2026-11-30T23:59:00.000Z' }));
  assert.ok(okCoupon({ starts_at: '2026-11-01T09:00:00-03:00' }));
  assert.ok(okCoupon({ expires_at: '2026-11-01T09:00:00.000Z' }));
  assert.equal(okCoupon({ starts_at: '2026-11-30T10:00:00.000Z', expires_at: '2026-11-01T10:00:00.000Z' }), false);
  assert.equal(okCoupon({ starts_at: '2026-11-01T10:00:00.000Z', expires_at: '2026-11-01T10:00:00.000Z' }), false);
  for (const date of ['amanhã', '2026-11-01', '2026-13-45T10:00:00Z', 1700000000, '']) assert.equal(okCoupon({ starts_at: date }), false, String(date));
  assert.ok(okCoupon({ max_uses: 1 }));
  assert.ok(okCoupon({ max_uses: 1_000_000 }));
  for (const max of [0, -1, 1_000_001, 1.5, '5']) assert.equal(okCoupon({ max_uses: max }), false, String(max));
});

test('ids and list parameters', () => {
  assert.ok(idSchema.safeParse('0b1c2d3e-0000-4000-8000-000000000001').success);
  for (const id of ['1', 'abc', '', null, "0b1c2d3e-0000-4000-8000-000000000001' or 1=1", 'eq.1']) assert.equal(idSchema.safeParse(id).success, false, String(id));
  assert.deepEqual(listSchema.parse({}), { offset: 0, limit: 12, search: '' });
  assert.deepEqual(listSchema.parse({ offset: 24, limit: 36, search: 'vaso' }), { offset: 24, limit: 36, search: 'vaso' });
  for (const bad of [{ offset: -1 }, { limit: 0 }, { limit: 121 }, { limit: 12.5 }, { search: 'x'.repeat(201) }, { order: 'id' }]) assert.equal(listSchema.safeParse(bad).success, false, JSON.stringify(bad));
});
