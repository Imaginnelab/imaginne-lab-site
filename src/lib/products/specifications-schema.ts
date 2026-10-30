import { z } from 'zod';

// Optional additions preserve existing products; the same limits are enforced by the migration.
export const productSpecificationsSchema = z.object({
  category_pt: z.string().trim().max(120).default(''),
  category_en: z.string().trim().max(120).default(''),
  category_es: z.string().trim().max(120).default(''),
  material_pt: z.string().trim().max(200).default(''),
  material_en: z.string().trim().max(200).default(''),
  material_es: z.string().trim().max(200).default(''),
  finish_pt: z.string().trim().max(200).default(''),
  finish_en: z.string().trim().max(200).default(''),
  finish_es: z.string().trim().max(200).default(''),
  care_pt: z.string().trim().max(1200).default(''),
  care_en: z.string().trim().max(1200).default(''),
  care_es: z.string().trim().max(1200).default(''),
  width_cm: z.number().min(0.01).max(10_000).multipleOf(0.01).nullable().default(null),
  height_cm: z.number().min(0.01).max(10_000).multipleOf(0.01).nullable().default(null),
  depth_cm: z.number().min(0.01).max(10_000).multipleOf(0.01).nullable().default(null),
  weight_g: z.number().min(0.01).max(10_000_000).multipleOf(0.01).nullable().default(null),
  stock_quantity: z.number().min(0).max(1_000_000).int().nullable().default(null),
});
export type ProductSpecifications = z.output<typeof productSpecificationsSchema>;
