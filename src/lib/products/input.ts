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
