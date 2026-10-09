import { z } from 'zod';

// What the admin may write, with exactly the limits the database enforces (supabase/migrations).
// These schemas are the gate of every admin Server Action: the objects are strict, so a field
// the administrator is not allowed to set (view_count, used_count, id, dates, created_by) is
// refused instead of silently reaching the database.

export const MAX_PRICE_CENTS = 100_000_000;
export const MAX_EXTRA_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_MODEL_BYTES = 15 * 1024 * 1024;
export const COUPON_CODE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

// Object path inside a storage bucket: never a URL, never a way out of the bucket.
const objectPath = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/).refine((value) => !value.includes('..'));
const modelPath = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._/-]{0,195}\.glb$/).refine((value) => !value.includes('..'));
const name = z.string().trim().min(1).max(120);
const description = z.string().trim().min(1).max(600);

export const idSchema = z.uuid();
export const activeSchema = z.boolean();

export const productSchema = z
  .strictObject({
    name_pt: name,
    name_en: name,
    name_es: name,
    description_pt: description,
    description_en: description,
    description_es: description,
    // Null means "price on request".
    price_cad_cents: z.number().int().min(0).max(MAX_PRICE_CENTS).nullable(),
    image_path: objectPath,
    extra_image_paths: z.array(objectPath).max(MAX_EXTRA_PHOTOS),
    model_path: modelPath.nullable(),
    model_bytes: z.number().int().min(1).max(MAX_MODEL_BYTES).nullable(),
    is_active: z.boolean(),
    sort_order: z.number().int().min(-100_000).max(100_000),
  })
  // The same file cannot be the cover and an extra photo, or appear twice.
  .refine((product) => new Set([product.image_path, ...product.extra_image_paths]).size === product.extra_image_paths.length + 1, { path: ['extra_image_paths'] })
  // A size only makes sense for a model that exists.
  .refine((product) => product.model_path !== null || product.model_bytes === null, { path: ['model_bytes'] });

export type ProductInput = z.infer<typeof productSchema>;

const instant = z.iso.datetime({ offset: true }).nullable();

export const couponSchema = z
  .strictObject({
    code: z.string().regex(COUPON_CODE),
    discount_type: z.enum(['percent', 'amount']),
    percent_off: z.number().int().min(1).max(100).nullable(),
    amount_off_cad_cents: z.number().int().min(1).max(MAX_PRICE_CENTS).nullable(),
    starts_at: instant,
    expires_at: instant,
    max_uses: z.number().int().min(1).max(1_000_000).nullable(),
    is_active: z.boolean(),
  })
  // Exactly one kind of discount, and it has to carry its value.
  .refine((coupon) => (coupon.discount_type === 'percent'
    ? coupon.percent_off !== null && coupon.amount_off_cad_cents === null
    : coupon.amount_off_cad_cents !== null && coupon.percent_off === null), { path: ['discount_type'] })
  .refine((coupon) => coupon.starts_at === null || coupon.expires_at === null || Date.parse(coupon.expires_at) > Date.parse(coupon.starts_at), { path: ['expires_at'] });

export type CouponInput = z.infer<typeof couponSchema>;

// Paging and search of the admin lists.
export const listSchema = z.strictObject({
  offset: z.number().int().min(0).max(1_000_000).default(0),
  limit: z.number().int().min(1).max(120).default(12),
  search: z.string().max(200).default(''),
});

export type ListInput = z.input<typeof listSchema>;

// Result of every admin action. The code is all the browser learns about a failure:
// no database message, constraint name or path ever travels with it.
export type AdminFailure = 'unauthorized' | 'invalid' | 'duplicate' | 'not_found' | 'files' | 'failed';
export type AdminResult = { ok: true } | { ok: false; code: AdminFailure };
