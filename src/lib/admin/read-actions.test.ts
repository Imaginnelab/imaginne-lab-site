import assert from 'node:assert/strict';
import { beforeEach, test, vi } from 'vitest';

// The reads behind the admin lists, with the caller and the queries simulated.
const state = vi.hoisted(() => ({ admin: null as { id: string } | null, asked: [] as unknown[], page: null as { rows: unknown[]; total: number } | null, on: null as boolean | null }));
vi.mock('@/lib/dal', () => ({ getAdmin: async () => state.admin }));
vi.mock('./queries', () => ({
  listProducts: async (input: unknown) => { state.asked.push(['products', input]); return state.page; },
  listCoupons: async (input: unknown) => { state.asked.push(['coupons', input]); return state.page; },
  mostViewedProductId: async () => 'star',
  maintenanceState: async () => state.on,
}));

import { loadAdminCoupons, loadAdminMaintenance, loadAdminProducts } from './read-actions';

beforeEach(() => { Object.assign(state, { admin: { id: 'admin' }, asked: [], page: { rows: [{ id: 'a' }], total: 30 }, on: false }); });

test('a caller who is not an administrator gets nothing and no query runs', async () => {
  state.admin = null;
  for (const result of [await loadAdminProducts({}), await loadAdminCoupons({}), await loadAdminMaintenance()]) assert.deepEqual(result, { ok: false, code: 'unauthorized' });
  assert.equal(state.asked.length, 0);
});

test('list parameters are validated before the queries', async () => {
  for (const input of [{ limit: 121 }, { offset: -1 }, { search: 'x'.repeat(201) }, { order: 'created_by' }, { limit: '12' }, null, 'x', [1]]) {
    assert.deepEqual(await loadAdminProducts(input), { ok: false, code: 'invalid' });
    assert.deepEqual(await loadAdminCoupons(input), { ok: false, code: 'invalid' });
  }
  assert.equal(state.asked.length, 0);
});

test('pages come back in the shape the lists expect', async () => {
  assert.deepEqual(await loadAdminProducts({ offset: 12, limit: 12, search: 'vaso' }), { ok: true, page: state.page, mostViewedId: 'star' });
  assert.deepEqual(await loadAdminCoupons({ offset: 12 }), { ok: true, page: state.page });
  assert.deepEqual(state.asked, [['products', { offset: 12, limit: 12, search: 'vaso' }], ['coupons', { offset: 12, limit: 12, search: '' }]]);
  assert.deepEqual(await loadAdminMaintenance(), { ok: true, on: false });
  state.page = null; state.on = null;
  assert.deepEqual(await loadAdminProducts({}), { ok: false, code: 'failed' });
  assert.deepEqual(await loadAdminCoupons({}), { ok: false, code: 'failed' });
  assert.deepEqual(await loadAdminMaintenance(), { ok: false, code: 'failed' });
});
