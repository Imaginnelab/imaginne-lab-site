import assert from 'node:assert/strict';
import { beforeEach, test, vi } from 'vitest';

// The actions are exercised against a simulated database: nothing here reaches Supabase.
const state = vi.hoisted(() => ({
  admin: null as { id: string } | null,
  clients: 0,
  calls: [] as { table: string; op: string; payload?: unknown; filter?: unknown[] }[],
  answers: {} as Record<string, { data?: unknown; error?: { code?: string; message?: string } | null; status?: number }>,
  files: { modelBytes: 777 as number | null } as { modelBytes: number | null } | false,
  inspected: [] as unknown[],
  removed: [] as { photos: string[]; models: string[] }[],
  revalidated: [] as string[],
}));

vi.mock('next/cache', () => ({ revalidatePath: (path: string) => { state.revalidated.push(path); } }));
vi.mock('@/lib/dal', () => ({ getAdmin: async () => state.admin }));
vi.mock('./storage', () => ({
  inspectFiles: async (photos: string[], model: string | null) => { state.inspected.push({ photos, model }); return state.files; },
  removeUnreferenced: async (_client: unknown, photos: string[], models: string[]) => { state.removed.push({ photos, models }); },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    state.clients += 1;
    return {
      from(table: string) {
        const call = { table, op: 'select', payload: undefined as unknown, filter: undefined as unknown[] | undefined };
        const done = () => {
          state.calls.push(call);
          return Promise.resolve({ data: null, error: null, status: 200, ...(state.answers[`${table}.${call.op}`] ?? {}) });
        };
        const api = {
          select: () => api,
          insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return api; },
          update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return api; },
          delete: () => { call.op = 'delete'; return api; },
          eq: (column: string, value: unknown) => { call.filter = [column, value]; return api; },
          maybeSingle: () => done(),
          then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => done().then(resolve, reject),
        };
        return api;
      },
    };
  },
}));

import {
  createCoupon, createProduct, deleteCoupon, deleteProduct, setCouponActive, setMaintenance, setProductActive, updateCoupon, updateProduct,
} from './actions';

const ID = '0b1c2d3e-0000-4000-8000-000000000001';
const product = {
  name_pt: 'Vaso', name_en: 'Vase', name_es: 'Jarrón', description_pt: 'd', description_en: 'd', description_es: 'd',
  price_cad_cents: 4990, image_path: 'nova-capa.webp', extra_image_paths: ['extra-1.webp'], model_path: 'novo.glb', model_bytes: 5,
  is_active: true, sort_order: 0,
};
const coupon = { code: 'VERAO10', discount_type: 'percent', percent_off: 10, amount_off_cad_cents: null, starts_at: null, expires_at: null, max_uses: null, is_active: true };
const PRODUCT_COLUMNS = ['description_en', 'description_es', 'description_pt', 'extra_image_paths', 'image_path', 'is_active', 'model_bytes', 'model_path', 'name_en', 'name_es', 'name_pt', 'price_cad_cents', 'sort_order'];
const COUPON_COLUMNS = ['amount_off_cad_cents', 'code', 'discount_type', 'expires_at', 'is_active', 'max_uses', 'percent_off', 'starts_at'];
const writes = () => state.calls.filter((call) => call.op !== 'select');
const keys = (value: unknown) => Object.keys(value as object).sort();

beforeEach(() => {
  Object.assign(state, { admin: { id: 'admin' }, clients: 0, calls: [], answers: {}, files: { modelBytes: 777 }, inspected: [], removed: [], revalidated: [] });
});

test('every action stops before touching the database when the caller is not an administrator', async () => {
  state.admin = null;
  const results = await Promise.all([
    createProduct(product), updateProduct(ID, product), setProductActive(ID, false), deleteProduct(ID),
    createCoupon(coupon), updateCoupon(ID, coupon), setCouponActive(ID, false), deleteCoupon(ID), setMaintenance(true),
  ]);
  for (const result of results) assert.deepEqual(result, { ok: false, code: 'unauthorized' });
  assert.equal(state.clients, 0);
  assert.equal(state.calls.length, 0);
  assert.equal(state.inspected.length, 0);
  assert.equal(state.revalidated.length, 0);
});

test('createProduct writes only the allowed columns, with the size read from storage', async () => {
  state.answers['products.insert'] = { data: [{ id: ID }] };
  assert.deepEqual(await createProduct(product), { ok: true });
  const [insert] = writes();
  assert.equal(insert.op, 'insert');
  assert.deepEqual(keys(insert.payload), PRODUCT_COLUMNS);
  // What the browser said about the size (5) is replaced by what storage reports.
  assert.equal((insert.payload as typeof product).model_bytes, 777);
  assert.deepEqual(state.inspected, [{ photos: ['nova-capa.webp', 'extra-1.webp'], model: 'novo.glb' }]);
  assert.deepEqual(state.revalidated, ['/[locale]']);
  assert.equal(state.removed.length, 0);
});

test('invalid input never reaches the database or storage', async () => {
  for (const input of [{ ...product, view_count: 99 }, { ...product, id: ID }, { ...product, created_by: 'x' }, { ...product, image_path: 'https://evil.example/x.png' },
    { ...product, image_path: '../x.png' }, { ...product, name_pt: '' }, { ...product, price_cad_cents: -1 }, null, 'x', []]) {
    assert.deepEqual(await createProduct(input), { ok: false, code: 'invalid' });
    assert.deepEqual(await updateProduct(ID, input), { ok: false, code: 'invalid' });
  }
  assert.deepEqual(await updateProduct('not-an-id', product), { ok: false, code: 'invalid' });
  assert.deepEqual(await deleteProduct("1' or 1=1"), { ok: false, code: 'invalid' });
  assert.deepEqual(await setProductActive(ID, 'yes'), { ok: false, code: 'invalid' });
  assert.deepEqual(await createCoupon({ ...coupon, used_count: 5 }), { ok: false, code: 'invalid' });
  assert.deepEqual(await createCoupon({ ...coupon, percent_off: null }), { ok: false, code: 'invalid' });
  assert.deepEqual(await setMaintenance('on'), { ok: false, code: 'invalid' });
  assert.equal(state.calls.length, 0);
  assert.equal(state.inspected.length, 0);
});

test('a product is not written when one of its files is not in storage', async () => {
  state.files = false;
  assert.deepEqual(await createProduct(product), { ok: false, code: 'files' });
  state.answers['products.select'] = { data: { image_path: 'antiga.webp', extra_image_paths: [], model_path: null } };
  assert.deepEqual(await updateProduct(ID, product), { ok: false, code: 'files' });
  assert.equal(writes().length, 0);
  assert.equal(state.removed.length, 0);
});

test('a refused insert answers with a code only and clears the files just uploaded', async () => {
  state.answers['products.insert'] = { error: { code: '42501', message: 'new row violates row-level security policy for table "products"' }, status: 403 };
  const result = await createProduct(product);
  assert.deepEqual(result, { ok: false, code: 'unauthorized' });
  assert.equal(JSON.stringify(result).includes('policy'), false);
  assert.deepEqual(state.removed, [{ photos: ['nova-capa.webp', 'extra-1.webp'], models: ['novo.glb'] }]);
  assert.equal(state.revalidated.length, 0);
  // A write that comes back empty was filtered by a policy.
  state.removed = [];
  state.answers['products.insert'] = { data: [] };
  assert.deepEqual(await createProduct(product), { ok: false, code: 'unauthorized' });
  // Other refusals keep their meaning without their text.
  state.answers['products.insert'] = { error: { code: '23514', message: 'violates check constraint "products_model_path_check"' }, status: 400 };
  assert.deepEqual(await createProduct(product), { ok: false, code: 'invalid' });
  state.answers['products.insert'] = { error: { code: 'XX000', message: 'internal' }, status: 500 };
  assert.deepEqual(await createProduct(product), { ok: false, code: 'failed' });
});

test('updateProduct removes the old files only after the write is confirmed', async () => {
  state.answers['products.select'] = { data: { image_path: 'antiga.webp', extra_image_paths: ['extra-1.webp', 'sai.png'], model_path: 'velho.glb' } };
  state.answers['products.update'] = { data: [{ id: ID }] };
  assert.deepEqual(await updateProduct(ID, product), { ok: true });
  const [update] = writes();
  assert.deepEqual(keys(update.payload), PRODUCT_COLUMNS);
  assert.deepEqual(update.filter, ['id', ID]);
  // extra-1.webp is still used and stays; what the product no longer points at goes.
  assert.deepEqual(state.removed, [{ photos: ['antiga.webp', 'sai.png'], models: ['velho.glb'] }]);
  assert.deepEqual(state.revalidated, ['/[locale]']);
});

test('a refused update keeps the old files and clears only the new ones', async () => {
  state.answers['products.select'] = { data: { image_path: 'antiga.webp', extra_image_paths: ['extra-1.webp'], model_path: 'velho.glb' } };
  state.answers['products.update'] = { error: { code: '42501' }, status: 403 };
  assert.deepEqual(await updateProduct(ID, product), { ok: false, code: 'unauthorized' });
  assert.deepEqual(state.removed, [{ photos: ['nova-capa.webp'], models: ['novo.glb'] }]);
  state.removed = [];
  state.answers['products.update'] = { data: [] };
  assert.deepEqual(await updateProduct(ID, product), { ok: false, code: 'not_found' });
  assert.deepEqual(state.removed, [{ photos: ['nova-capa.webp'], models: ['novo.glb'] }]);
  state.answers['products.select'] = { data: null };
  assert.deepEqual(await updateProduct(ID, product), { ok: false, code: 'not_found' });
  assert.equal(state.revalidated.length, 0);
});

test('deleteProduct removes the files only after the row is gone', async () => {
  state.answers['products.select'] = { data: { image_path: 'capa.webp', extra_image_paths: ['e1.webp'], model_path: 'm.glb' } };
  state.answers['products.delete'] = { data: [] };
  assert.deepEqual(await deleteProduct(ID), { ok: false, code: 'not_found' });
  assert.equal(state.removed.length, 0);
  state.answers['products.delete'] = { error: { code: '42501' }, status: 403 };
  assert.deepEqual(await deleteProduct(ID), { ok: false, code: 'unauthorized' });
  assert.equal(state.removed.length, 0);
  state.answers['products.delete'] = { data: [{ id: ID }] };
  assert.deepEqual(await deleteProduct(ID), { ok: true });
  assert.deepEqual(state.removed, [{ photos: ['capa.webp', 'e1.webp'], models: ['m.glb'] }]);
});

test('activating a product or a coupon sends that one column', async () => {
  state.answers['products.update'] = { data: [{ id: ID }] };
  state.answers['coupons.update'] = { data: [{ id: ID }] };
  assert.deepEqual(await setProductActive(ID, false), { ok: true });
  assert.deepEqual(await setCouponActive(ID, true), { ok: true });
  assert.deepEqual(writes().map((call) => [call.table, call.payload, call.filter]), [
    ['products', { is_active: false }, ['id', ID]],
    ['coupons', { is_active: true }, ['id', ID]],
  ]);
  state.answers['coupons.update'] = { data: [] };
  assert.deepEqual(await setCouponActive(ID, true), { ok: false, code: 'not_found' });
});

test('coupons are written with their eight columns and a repeated code has its own answer', async () => {
  state.answers['coupons.insert'] = { data: [{ id: ID }] };
  state.answers['coupons.update'] = { data: [{ id: ID }] };
  state.answers['coupons.delete'] = { data: [{ id: ID }] };
  assert.deepEqual(await createCoupon(coupon), { ok: true });
  assert.deepEqual(await updateCoupon(ID, { ...coupon, discount_type: 'amount', percent_off: null, amount_off_cad_cents: 500 }), { ok: true });
  assert.deepEqual(await deleteCoupon(ID), { ok: true });
  const [insert, update, remove] = writes();
  assert.deepEqual(keys(insert.payload), COUPON_COLUMNS);
  assert.deepEqual(keys(update.payload), COUPON_COLUMNS);
  assert.deepEqual([remove.op, remove.filter], ['delete', ['id', ID]]);
  assert.deepEqual(state.revalidated, ['/[locale]/admin', '/[locale]/admin', '/[locale]/admin']);
  state.answers['coupons.insert'] = { error: { code: '23505', message: 'duplicate key value violates unique constraint "coupons_code_key"' }, status: 409 };
  const repeated = await createCoupon(coupon);
  assert.deepEqual(repeated, { ok: false, code: 'duplicate' });
  assert.equal(JSON.stringify(repeated).includes('coupons_code_key'), false);
  state.answers['coupons.update'] = { error: { code: '23505' }, status: 409 };
  assert.deepEqual(await updateCoupon(ID, coupon), { ok: false, code: 'duplicate' });
});

test('setMaintenance changes one flag of the single settings row', async () => {
  state.answers['site_settings.update'] = { data: [{ id: true }] };
  assert.deepEqual(await setMaintenance(true), { ok: true });
  const [update] = writes();
  assert.deepEqual([update.table, update.payload, update.filter], ['site_settings', { maintenance_mode: true }, ['id', true]]);
  assert.deepEqual(state.revalidated, ['/[locale]']);
  state.answers['site_settings.update'] = { data: [] };
  assert.deepEqual(await setMaintenance(false), { ok: false, code: 'unauthorized' });
  state.answers['site_settings.update'] = { error: { code: '42501' }, status: 403 };
  assert.deepEqual(await setMaintenance(false), { ok: false, code: 'unauthorized' });
});
