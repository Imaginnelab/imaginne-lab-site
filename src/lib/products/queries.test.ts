import { beforeEach, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({ maintenance: false, admin: false, fail: false, missing: false, error: null as { code: string; message: string } | null, calls: [] as unknown[][], rows: [] as unknown[] }));
vi.mock('@/lib/dal', () => ({ isUnderMaintenance: async () => state.maintenance, getAdmin: async () => state.admin ? { id: 'admin' } : null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (table: string) => {
  state.calls.push(['from', table]);
  let selected = '';
  const query = {
    select(fields: string) { selected = fields; state.calls.push(['select', fields]); return query; },
    eq(field: string, value: unknown) { state.calls.push(['eq', field, value]); return query; },
    in(field: string, value: unknown) { state.calls.push(['in', field, value]); return query; },
    abortSignal: async () => ({ data: state.rows, error: state.error ?? (state.missing && selected.includes('category_pt') ? { code: '42703', message: 'column products.category_pt does not exist' } : state.fail ? { message: 'private database error' } : null) }),
  };
  return query;
} }) }));

import { getCartProducts, getProduct } from './queries';
const id = '10000000-0000-4000-8000-000000000001';
const row = {
  id, name_pt: 'Vaso', name_en: 'Vase', name_es: 'Florero', description_pt: 'Descrição completa',
  description_en: 'Full description', description_es: 'Descripción completa', price_cad_cents: 4990,
  image_path: 'cover.webp', extra_image_paths: ['second.webp'], model_path: null, model_bytes: null, view_count: 0,
};
beforeEach(() => Object.assign(state, { maintenance: false, admin: false, fail: false, missing: false, error: null, calls: [], rows: [{ ...row }] }));
test('detail and cart reject invalid identifiers, locale, excessive input and injected prices before any database lookup', async () => {
  for (const input of [{ locale: 'fr', ids: [id] }, { locale: 'pt', ids: ['bad'] }, { locale: 'en', ids: Array(51).fill(id) },
    { locale: 'en', ids: [id], price: 1 }, null]) expect(await getCartProducts(input)).toEqual({ ok: false });
  expect(await getProduct('pt', '../admin')).toEqual({ ok: false });
  expect(state.calls).toEqual([]);
});
test('public reads require active products and respect maintenance even through the cart action', async () => {
  state.maintenance = true;
  expect(await getCartProducts({ locale: 'en', ids: [id] })).toEqual({ ok: true, products: [] });
  expect(state.calls).toEqual([]);
  state.admin = true;
  await getCartProducts({ locale: 'en', ids: [id, id] });
  expect(state.calls).toContainEqual(['eq', 'is_active', true]);
  expect(state.calls).toContainEqual(['in', 'id', [id]]);
  const selected = String(state.calls.find((call) => call[0] === 'select')?.[1]);
  expect(selected.split(',colors:')[0]).not.toMatch(/created_by|sort_order|is_active/);
  expect(selected).toContain('colors:cor(id,name,hex,locale,sort_order)');
});
test('server selects the requested translation and authoritative price, without exposing admin fields', async () => {
  for (const [locale, name, description] of [['pt', 'Vaso', 'Descrição completa'], ['en', 'Vase', 'Full description'], ['es', 'Florero', 'Descripción completa']] as const) {
    const result = await getCartProducts({ locale, ids: [id] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.products[0]).toMatchObject({ name, description, priceCents: 4990, photos: expect.any(Array) });
  }
  state.rows = [{ ...row, price_cad_cents: null }];
  expect(await getProduct('en', id)).toMatchObject({ ok: true, product: { price: null, priceCents: null } });
});
test('missing products and database failures stay distinct, and errors do not leak details', async () => {
  state.rows = [];
  expect(await getProduct('en', id)).toEqual({ ok: true, product: null });
  state.fail = true;
  expect(await getCartProducts({ locale: 'pt', ids: [id] })).toEqual({ ok: false });
  expect(await getProduct('en', id)).toEqual({ ok: false });
});

test('details include only localized specifications, measurements and stock; inactive preview requires an admin', async () => {
  state.rows = [{ ...row, material_pt: 'Plástico', material_en: 'Plastic', care_pt: 'Limpar à mão', care_en: '', width_cm: 10.5, weight_g: 180, stock_quantity: 0 }];
  const result = await getProduct('en', id);
  expect(result).toMatchObject({ ok: true, product: { specifications: { material: 'Plastic', care: 'Limpar à mão' }, widthCm: 10.5, weightGrams: 180, stockQuantity: 0 } });
  expect(state.calls).toContainEqual(['eq', 'is_active', true]);
  state.calls = []; state.admin = true;
  await getProduct('pt', id);
  expect(state.calls).not.toContainEqual(['eq', 'is_active', true]);
  expect(state.calls.find((call) => call[0] === 'select')?.[1]).not.toContain('created_by');
});

test('details remain available before the optional-column migration, preserving both session and active filter', async () => {
  state.missing = true;
  expect(await getProduct('pt', id)).toMatchObject({ ok: true, product: { name: 'Vaso', specifications: { material: '' }, stockQuantity: null } });
  expect(state.calls.filter((call) => call[0] === 'select')).toHaveLength(2);
  expect(state.calls.filter((call) => call[0] === 'eq')).toEqual([['eq', 'is_active', true], ['eq', 'is_active', true]]);
  state.calls = []; state.error = { code: '42501', message: 'permission denied for column category_pt' };
  expect(await getProduct('pt', id)).toEqual({ ok: false });
  expect(state.calls.filter((call) => call[0] === 'select')).toHaveLength(1);
});

test('colour names follow the requested language while measurements and media remain shared', async () => {
  state.rows = [{ ...row, colors: [{ id: '30000000-0000-4000-8000-000000000001', name: 'Branco', hex: '#FFFFFF', locale: 'pt', sort_order: 1 }, { id: '30000000-0000-4000-8000-000000000002', name: 'Verde', hex: '#556B2F', locale: 'pt', sort_order: 0 },
    { id: '30000000-0000-4000-8000-000000000003', name: 'Green', hex: '#556B2F', locale: 'en', sort_order: 0 }], width_cm: 15.5, stock_quantity: 12 }];
  for (const locale of ['pt', 'en', 'es'] as const) {
    expect(await getProduct(locale, id)).toMatchObject({ ok: true, product: {
      colors: locale === 'en' ? [{ name: 'Green', hex: '#556B2F' }] : [{ name: 'Verde', hex: '#556B2F' }, { name: 'Branco', hex: '#FFFFFF' }], widthCm: 15.5, stockQuantity: 12,
      photos: expect.arrayContaining([expect.stringContaining('cover.webp')]),
    } });
  }
});
