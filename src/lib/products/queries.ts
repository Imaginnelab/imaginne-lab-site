import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getAdmin, isUnderMaintenance } from '@/lib/dal';
import { SUPABASE_URL } from '@/lib/env';
import { formatPrice, imageUrl, localized, modelUrl, priceCents } from './format';
import { searchFilter, searchTerm } from '@/lib/search';
import { MAX_OFFSET, PAGE_SIZE, pageSchema, productIdSchema } from './input';
import type { Locale } from '@/i18n/config';
import type { ProductDTO, ProductPage, PageResult } from './types';

const fields = 'id,name_pt,name_en,name_es,description_pt,description_en,description_es,price_cad_cents,image_path,extra_image_paths,model_path,model_bytes,view_count' as const;
const columns = ['name_pt', 'name_en', 'name_es', 'description_pt', 'description_en', 'description_es'];
type PublicRow = {
  id: string; name_pt: string; name_en: string; name_es: string;
  description_pt: string; description_en: string; description_es: string;
  price_cad_cents: number | null; image_path: string; extra_image_paths: string[];
  model_path: string | null; model_bytes: number | null; view_count: number;
};
const validPath = (path: unknown): path is string =>
  typeof path === 'string' && path.length <= 200 && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(path) && !path.includes('..');

function dto(row: PublicRow, locale: Locale, featured = false): ProductDTO | null {
  const name = localized(row, 'name', locale);
  const description = localized(row, 'description', locale);
  if (!productIdSchema.safeParse(row.id).success || !name.trim() || !description || !validPath(row.image_path)) return null;
  const paths = [row.image_path, ...row.extra_image_paths.slice(0, 5).filter(validPath)];
  const photos = Array.from(new Set(paths)).map((path) => imageUrl(SUPABASE_URL, path));
  const model = modelUrl(SUPABASE_URL, row.model_path);
  const cents = priceCents(row);
  return {
    id: row.id, name, description, price: cents === null ? null : formatPrice(cents, locale),
    photos, modelUrl: model || null,
    modelBytes: typeof row.model_bytes === 'number' && Number.isInteger(row.model_bytes) && row.model_bytes > 0 ? row.model_bytes : null,
    featured,
  };
}

export async function catalogueAllowed(): Promise<boolean> {
  return !(await isUnderMaintenance()) || (await getAdmin()) !== null;
}

export async function getProductPage(input: unknown): Promise<PageResult> {
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { locale, offset } = parsed.data;
  const term = searchTerm(parsed.data.term);
  const empty: ProductPage = { items: [], offset, hasMore: false, featuredId: null, term };
  try {
    // The same check applies to direct Action calls; the outer layout alone is insufficient.
    if (!(await catalogueAllowed())) return { ok: true, page: empty };
    const supabase = await createClient();
    let featured: ProductDTO | null = null;
    let featuredId = term ? null : parsed.data.featuredId ?? null;
    if (!term && offset === 0) {
      const { data, error } = await supabase.from('products').select(fields).eq('is_active', true)
        .gt('view_count', 0).order('view_count', { ascending: false }).order('id', { ascending: true })
        .limit(1).abortSignal(AbortSignal.timeout(12_000)).maybeSingle();
      if (error) return { ok: false };
      featured = data ? dto(data, locale, true) : null;
      featuredId = featured?.id ?? null;
    }
    // The highlighted product occupies one of the twelve initial positions, as in the legacy.
    const size = offset === 0 && featured ? PAGE_SIZE - 1 : PAGE_SIZE;
    let query = supabase.from('products').select(fields).eq('is_active', true)
      .order('sort_order', { ascending: true }).order('created_at', { ascending: false }).order('id', { ascending: true });
    if (featuredId) query = query.neq('id', featuredId);
    const filter = searchFilter(term, columns);
    if (filter) query = query.or(filter.slice(1, -1));
    const { data, error } = await query.range(offset, offset + size - 1).abortSignal(AbortSignal.timeout(12_000));
    if (error || !data) return { ok: false };
    const items = data.map((row) => dto(row, locale)).filter((item): item is ProductDTO => item !== null);
    return { ok: true, page: {
      items: featured ? [featured, ...items] : items,
      offset: offset + data.length,
      hasMore: data.length === size && offset + data.length <= MAX_OFFSET,
      featuredId, term,
    } };
  } catch { return { ok: false }; }
}
