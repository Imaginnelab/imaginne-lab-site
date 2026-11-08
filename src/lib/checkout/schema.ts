import { z } from 'zod';
import { locales } from '@/i18n/config';
import { cartSchema } from '@/lib/products/input';

export const MAX_CHECKOUT_CENTS = 99_999_999;
export const checkoutSchema = z.object({
  locale: z.enum(locales),
  lines: cartSchema.refine((lines) => lines.length > 0),
  subtotalCents: z.number().int().min(1).max(MAX_CHECKOUT_CENTS),
  requestId: z.string().uuid(),
}).strict();
export const sessionIdSchema = z.string().regex(/^cs_test_[A-Za-z0-9]{1,200}$/);

export type CheckoutError = 'invalid' | 'signIn' | 'unavailable' | 'configuration' | 'productUnavailable' | 'colorUnavailable' | 'stock' | 'priceChanged' | 'taxConfiguration';
export type CheckoutResult = { ok: true; url: string } | { ok: false; error: CheckoutError };
