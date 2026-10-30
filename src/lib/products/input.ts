import { z } from 'zod';
import { locales } from '@/i18n/config';

export const MAX_OFFSET = 100_000;
export const PAGE_SIZE = 12;
export const pageSchema = z.object({
  locale: z.enum(locales),
  term: z.string().max(60).default(''),
  offset: z.number().int().min(0).max(MAX_OFFSET).default(0),
  featuredId: z.string().uuid().nullable().optional(),
}).strict();
export const productIdSchema = z.string().uuid();

export const MAX_CART_ITEMS = 50;
export const MAX_CART_QUANTITY = 99;
export const cartLineSchema = z.object({
  id: productIdSchema,
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
  colorId: productIdSchema.nullable().optional(),
}).strict();
export const cartSchema = z.array(cartLineSchema).max(MAX_CART_ITEMS)
  .refine((lines) => new Set(lines.map((line) => line.id + ':' + (line.colorId ?? ''))).size === lines.length);
export const cartProductsSchema = z.object({
  locale: z.enum(locales),
  ids: z.array(productIdSchema).max(MAX_CART_ITEMS),
}).strict();
