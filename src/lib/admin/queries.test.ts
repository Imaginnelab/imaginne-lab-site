import { beforeEach, expect, test, vi } from 'vitest';
const state = vi.hoisted(() => ({ admin: true, missing: false, forbidden: false, asked: [] as string[], rows: [] as Record<string, unknown>[] }));
vi.mock('@/lib/dal', () => ({ getAdmin: async () => state.admin ? { id: 'admin' } : null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: () => {
  let selected = '';
  const query = {
    select(fields: string) { selected = fields; state.asked.push(fields); return query; },
    or: () => query, order: () => query,
    range: async () => ({ data: state.rows, count: 1,
      error: state.forbidden ? { code: '42501', message: 'permission denied for column category_pt' } :
        state.missing && selected.includes('category_pt') ? { code: '42703', message: 'column products.category_pt does not exist' } : null }),
  };
  return query;
} }) }));
import { listProducts } from './queries';
beforeEach(() => Object.assign(state, { admin: true, missing: false, forbidden: false, asked: [], rows: [{ id: '10000000-0000-4000-8000-000000000001', name_pt: 'Vaso', image_path: 'cover.webp' }] }));
test('admin listing remains available when the optional product columns have not been migrated', async () => {
  state.missing = true;
  expect(await listProducts()).toMatchObject({ total: 1, rows: [{ name_pt: 'Vaso', category_pt: '', stock_quantity: null }] });
  expect(state.asked).toHaveLength(2);
  expect(state.asked[1]).not.toContain('category_pt');
  expect(state.asked.join(',')).not.toContain('created_by');
});
test('listing neither retries permission errors nor queries without an administrator', async () => {
  state.forbidden = true;
  expect(await listProducts()).toBeNull(); expect(state.asked).toHaveLength(1);
  state.admin = false; state.asked = [];
  expect(await listProducts()).toBeNull(); expect(state.asked).toHaveLength(0);
});

test('admin listing reads ordered child colours and never selects removed locale columns', async () => {
  state.rows[0].colors = [{ name: 'Branco', hex: '#FFFFFF', locale: 'pt', sort_order: 1 }, { name: 'Verde', hex: '#556B2F', locale: 'pt', sort_order: 0 }];
  expect(await listProducts()).toMatchObject({ rows: [{ colors: [{ name: 'Verde', hex: '#556B2F', locale: 'pt' }, { name: 'Branco', hex: '#FFFFFF', locale: 'pt' }] }] });
  expect(state.asked[0]).toContain('colors:cor(name,hex,locale,sort_order)');
  expect(state.asked[0]).not.toMatch(/(?:colors|sizes|personalization)_(?:pt|en|es)/);
});
