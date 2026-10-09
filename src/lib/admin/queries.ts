import 'server-only';
import { getAdmin } from '@/lib/dal';
import { searchFilter } from '@/lib/search';
import { createClient } from '@/lib/supabase/server';
import { type ListInput, listSchema } from './schemas';

// Reads for the admin pages. Each one checks the caller next to the data (the layout's check
// is a convenience, not the protection) and names its columns, so nothing extra comes along.

const PRODUCT_COLUMNS = 'id, name_pt, name_en, name_es, description_pt, description_en, description_es, price_cad_cents, image_path, extra_image_paths, model_path, model_bytes, is_active, sort_order, view_count';
const COUPON_COLUMNS = 'id, code, discount_type, percent_off, amount_off_cad_cents, starts_at, expires_at, max_uses, used_count, is_active';

export type AdminPage<Row> = { rows: Row[]; total: number };

// supabase-js adds the outer parentheses of an "or" filter itself.
const orFilter = (term: string, columns: string[]) => searchFilter(term, columns).slice(1, -1);

// One page of products in the stable order of the lists (id breaks every tie), with the total
// that matches the search. Null when the caller is not an administrator or the read fails.
export async function listProducts(input: ListInput = {}) {
  const parsed = listSchema.safeParse(input);
  if (!parsed.success || !(await getAdmin())) return null;
  const { offset, limit, search } = parsed.data;
  const supabase = await createClient();
  const filter = orFilter(search, ['name_pt', 'name_en', 'name_es']);
  const query = supabase.from('products').select(PRODUCT_COLUMNS, { count: 'exact' });
  const { data, count, error } = await (filter ? query.or(filter) : query)
    .order('sort_order', { ascending: true }).order('created_at', { ascending: false }).order('id', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) return null;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function listCoupons(input: ListInput = {}) {
  const parsed = listSchema.safeParse(input);
  if (!parsed.success || !(await getAdmin())) return null;
  const { offset, limit, search } = parsed.data;
  const supabase = await createClient();
  const filter = orFilter(search, ['code']);
  const query = supabase.from('coupons').select(COUPON_COLUMNS, { count: 'exact' });
  const { data, count, error } = await (filter ? query.or(filter) : query)
    .order('created_at', { ascending: false }).order('id', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) return null;
  return { rows: data ?? [], total: count ?? 0 };
}

export type AdminProduct = NonNullable<Awaited<ReturnType<typeof listProducts>>>['rows'][number];
export type AdminCoupon = NonNullable<Awaited<ReturnType<typeof listCoupons>>>['rows'][number];

// The active product with the most views (it gets the star), or null when nothing was viewed.
export async function mostViewedProductId(): Promise<string | null> {
  if (!(await getAdmin())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from('products').select('id').eq('is_active', true).gt('view_count', 0)
    .order('view_count', { ascending: false }).order('id', { ascending: true }).limit(1);
  return error || !data?.length ? null : data[0].id;
}

// The maintenance switch as the admin page shows it; null when it cannot be read.
export async function maintenanceState(): Promise<boolean | null> {
  if (!(await getAdmin())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from('site_settings').select('maintenance_mode').eq('id', true).maybeSingle();
  return error || !data ? null : data.maintenance_mode;
}
