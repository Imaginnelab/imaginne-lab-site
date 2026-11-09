import { z } from 'zod';
import { locales } from '@/i18n/config';
import { cartSchema } from '@/lib/products/input';

export const postalCodeSchema = z.string().trim().max(10).transform((value) => value.toUpperCase().replace(/\s/g, ''))
  .pipe(z.string().regex(/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/));
export const shippingAddressSchema = z.object({
  name: z.string().trim().min(2).max(100),
  line1: z.string().trim().min(3).max(150),
  line2: z.string().trim().max(150).default(''),
  city: z.string().trim().min(2).max(100),
  province: z.enum(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']),
  postalCode: postalCodeSchema,
}).strict();
export const shippingChoiceSchema = z.object({
  address: shippingAddressSchema,
  serviceCode: z.enum(['DOM.RP', 'DOM.EP', 'DOM.XP', 'DOM.PC']),
  amountCents: z.number().int().min(1).max(9_999_999),
}).strict();
export const shippingQuoteSchema = z.object({
  locale: z.enum(locales), lines: cartSchema.refine((lines) => lines.length > 0), postalCode: postalCodeSchema,
}).strict();
export type ShippingChoice = z.output<typeof shippingChoiceSchema>;
export type ShippingAddress = z.output<typeof shippingAddressSchema>;
export type Parcel = { lengthCm: number; widthCm: number; heightCm: number; weightKg: number };
export type ShippingRate = { serviceCode: ShippingChoice['serviceCode']; name: string; amountCents: number; transitDays: number | null };
export type ShippingError = 'configuration' | 'invalidPostalCode' | 'products' | 'missingMeasurements' | 'parcelTooLarge' | 'noServices' | 'providerUnavailable';
export type ShippingQuoteResult = { ok: true; rates: ShippingRate[]; parcel: Parcel } | { ok: false; error: ShippingError };
