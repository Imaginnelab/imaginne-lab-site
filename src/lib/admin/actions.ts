'use server';

import { revalidatePath } from 'next/cache';
import { getAdmin } from '@/lib/dal';
import { imagePaths } from '@/lib/products/format';
import { productSpecificationsSchema } from '@/lib/products/specifications-schema';
import { missingProductSpecifications } from '@/lib/products/schema-compatibility';
import { createClient } from '@/lib/supabase/server';
import {
  type AdminFailure, type AdminResult, type CouponInput, type ProductInput,
  activeSchema, couponSchema, idSchema, productSchema,
} from './schemas';
import { inspectFiles, removeUnreferenced } from './storage';

// Every write of the admin goes through one of these actions. Each one:
//   1. asks the server who is calling (getAdmin) and stops unless it is an administrator;
//   2. validates what arrived with the schemas (the limits of the database);
//   3. writes as that administrator, so row level security is still the real authorization;
//   4. sends only the columns the administrator may set;
//   5. answers with { ok } or a short failure code, never with a database message;
//   6. revalidates what changed.
// Anyone can call a Server Action directly, whatever the page shows: nothing here trusts
// the interface.

const denied: AdminResult = { ok: false, code: 'unauthorized' };
const invalid: AdminResult = { ok: false, code: 'invalid' };
const fail = (code: AdminFailure): AdminResult => ({ ok: false, code });

type DatabaseError = { code?: string; message?: string } | null;

// Turns a database refusal into the code the interface is allowed to see.
function failure(error: DatabaseError, status?: number): AdminResult {
  const code = error?.code;
  if (code === '23505') return fail('duplicate');
  if (code === '23514' || code === '22P02' || code === '23502' || code === '22023') return fail('invalid');
  if (code === 'P0002') return fail('not_found');
  if (code === '42501' || code === 'PGRST301' || status === 401 || status === 403) return fail('unauthorized');
  if (missingProductSpecifications(error)) return fail('schema');
  if (code === 'PGRST202' && error?.message?.includes('save_product_with_colors')) return fail('schema');
  return fail('failed');
}

// Products appear on every page of the site (carousel, catalogue) and in the admin.
const refreshSite = () => revalidatePath('/[locale]', 'layout');

const filesOf = (row: unknown) => {
  const model = (row as { model_path?: unknown } | null)?.model_path;
  return { photos: imagePaths(row), models: typeof model === 'string' && model ? [model] : [] };
};
const productColumns = (product: ProductInput, modelBytes: number | null) => ({
  ...productSpecificationsSchema.parse(product),
  name_pt: product.name_pt,
  name_en: product.name_en,
  name_es: product.name_es,
  description_pt: product.description_pt,
  description_en: product.description_en,
  description_es: product.description_es,
  price_cad_cents: product.price_cad_cents,
  image_path: product.image_path,
  extra_image_paths: product.extra_image_paths,
  model_path: product.model_path,
  // The size comes from the stored file itself, not from what the browser said.
  model_bytes: modelBytes,
  is_active: product.is_active,
  sort_order: product.sort_order,
});
const couponColumns = (coupon: CouponInput) => ({
  code: coupon.code,
  discount_type: coupon.discount_type,
  percent_off: coupon.percent_off,
  amount_off_cad_cents: coupon.amount_off_cad_cents,
  starts_at: coupon.starts_at,
  expires_at: coupon.expires_at,
  max_uses: coupon.max_uses,
  is_active: coupon.is_active,
});

// ---- Products ---------------------------------------------------------------------------

export async function createProduct(input: unknown): Promise<AdminResult> {
  if (!(await getAdmin())) return denied;
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const product = parsed.data;
  const supabase = await createClient();
  const uploaded = { photos: [product.image_path, ...product.extra_image_paths], models: product.model_path ? [product.model_path] : [] };

  const files = await inspectFiles(uploaded.photos, product.model_path);
  if (!files) return fail('files');
  const { data, error, status } = await supabase.rpc('save_product_with_colors', {
    p_id: null, p_product: productColumns(product, files.modelBytes), p_colors: product.colors,
  });
  if (error || !data) {
    // Nothing was written, so nothing points at the files that were just uploaded.
    await removeUnreferenced(supabase, uploaded.photos, uploaded.models);
    return error ? failure(error, status) : denied;
  }
  refreshSite();
  return { ok: true };
}

export async function updateProduct(id: unknown, input: unknown): Promise<AdminResult> {
  if (!(await getAdmin())) return denied;
  const parsedId = idSchema.safeParse(id);
  const parsed = productSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return invalid;
  const product = parsed.data;
  const supabase = await createClient();

  const current = await supabase.from('products').select('image_path, extra_image_paths, model_path').eq('id', parsedId.data).maybeSingle();
  if (current.error) return failure(current.error, current.status);
  if (!current.data) return fail('not_found');
  const before = filesOf(current.data);
  const after = { photos: [product.image_path, ...product.extra_image_paths], models: product.model_path ? [product.model_path] : [] };
  const added = {
    photos: after.photos.filter((path) => !before.photos.includes(path)),
    models: after.models.filter((path) => !before.models.includes(path)),
  };

  // Every file is checked, kept ones included: the model's size is read again from Storage.
  const files = await inspectFiles(after.photos, product.model_path);
  if (!files) return fail('files');
  const { data, error, status } = await supabase.rpc('save_product_with_colors', {
    p_id: parsedId.data, p_product: productColumns(product, files.modelBytes), p_colors: product.colors,
  });
  if (error || !data) {
    await removeUnreferenced(supabase, added.photos, added.models);
    return error ? failure(error, status) : fail('not_found');
  }
  // Only now, with the write confirmed, the files the product stopped using can go.
  await removeUnreferenced(
    supabase,
    before.photos.filter((path) => !after.photos.includes(path)),
    before.models.filter((path) => !after.models.includes(path)),
  );
  refreshSite();
  return { ok: true };
}

export async function setProductActive(id: unknown, active: unknown): Promise<AdminResult> {
  if (!(await getAdmin())) return denied;
  const parsedId = idSchema.safeParse(id);
  const parsedActive = activeSchema.safeParse(active);
  if (!parsedId.success || !parsedActive.success) return invalid;
  const supabase = await createClient();
  const { data, error, status } = await supabase.from('products').update({ is_active: parsedActive.data }).eq('id', parsedId.data).select('id');
  if (error) return failure(error, status);
  if (!data?.length) return fail('not_found');
  refreshSite();
  return { ok: true };
}

export async function deleteProduct(id: unknown): Promise<AdminResult> {
  if (!(await getAdmin())) return denied;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return invalid;
  const supabase = await createClient();
  const current = await supabase.from('products').select('image_path, extra_image_paths, model_path').eq('id', parsedId.data).maybeSingle();
  if (current.error) return failure(current.error, current.status);
  if (!current.data) return fail('not_found');
  const { data, error, status } = await supabase.from('products').delete().eq('id', parsedId.data).select('id');
  if (error) return failure(error, status);
  if (!data?.length) return fail('not_found');
  // Only after the row is gone, so a refused delete never loses the files.
  const files = filesOf(current.data);
  await removeUnreferenced(supabase, files.photos, files.models);
  refreshSite();
  return { ok: true };
}

// ---- Coupons ----------------------------------------------------------------------------

const refreshAdmin = () => revalidatePath('/[locale]/admin', 'layout');

export async function createCoupon(input: unknown): Promise<AdminResult> {
  if (!(await getAdmin())) return denied;
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error, status } = await supabase.from('coupons').insert(couponColumns(parsed.data)).select('id');
  if (error) return failure(error, status);
  if (!data?.length) return denied;
  refreshAdmin();
  return { ok: true };
}

export async function updateCoupon(id: unknown, input: unknown): Promise<AdminResult> {
  if (!(await getAdmin())) return denied;
  const parsedId = idSchema.safeParse(id);
  const parsed = couponSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error, status } = await supabase.from('coupons').update(couponColumns(parsed.data)).eq('id', parsedId.data).select('id');
  if (error) return failure(error, status);
  if (!data?.length) return fail('not_found');
  refreshAdmin();
  return { ok: true };
}

export async function setCouponActive(id: unknown, active: unknown): Promise<AdminResult> {
  if (!(await getAdmin())) return denied;
  const parsedId = idSchema.safeParse(id);
  const parsedActive = activeSchema.safeParse(active);
  if (!parsedId.success || !parsedActive.success) return invalid;
  const supabase = await createClient();
  const { data, error, status } = await supabase.from('coupons').update({ is_active: parsedActive.data }).eq('id', parsedId.data).select('id');
  if (error) return failure(error, status);
  if (!data?.length) return fail('not_found');
  refreshAdmin();
  return { ok: true };
}

export async function deleteCoupon(id: unknown): Promise<AdminResult> {
  if (!(await getAdmin())) return denied;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return invalid;
  const supabase = await createClient();
  const { data, error, status } = await supabase.from('coupons').delete().eq('id', parsedId.data).select('id');
  if (error) return failure(error, status);
  if (!data?.length) return fail('not_found');
  refreshAdmin();
  return { ok: true };
}

// ---- Maintenance ------------------------------------------------------------------------

// Turning it on closes the site to everyone but administrators; the pages read it on each request.
export async function setMaintenance(on: unknown): Promise<AdminResult> {
  if (!(await getAdmin())) return denied;
  const parsed = activeSchema.safeParse(on);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error, status } = await supabase.from('site_settings').update({ maintenance_mode: parsed.data }).eq('id', true).select('id');
  if (error) return failure(error, status);
  if (!data?.length) return denied;
  refreshSite();
  return { ok: true };
}
