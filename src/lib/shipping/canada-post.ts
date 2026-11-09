import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { isolatedCheckoutBackend } from '@/lib/checkout/stripe';
import { canadaPostSettings } from './config';
import type { Parcel, ShippingRate } from './schema';

const API_ROOT = 'https://api.canadapost-postescanada.ca/prod/devportal-portaildesdeveloppeurs';
const tokenSchema = z.object({ access_token: z.string().min(1).max(10000), expires_in: z.number().int().min(1).max(86400) });
const money = z.union([z.number(), z.string()]).transform(String).refine((value) => /^\d{1,5}(\.\d{1,2})?$/.test(value)).transform((value) => Math.round(Number(value) * 100));
const rateSchema = z.object({
  serviceCode: z.enum(['DOM.RP', 'DOM.EP', 'DOM.XP', 'DOM.PC']), serviceName: z.string().min(1).max(150),
  priceDetails: z.object({ due: money }),
  serviceStandard: z.object({ expectedTransitTime: z.number().int().min(0).max(99).optional() }).optional(),
});
let cachedToken: { key: string; token: string; expires: number } | null = null;
let pendingToken: { key: string; promise: Promise<string> } | null = null;

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) throw new Error('Canada Post unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 256_000) { await reader.cancel(); throw new Error('Invalid carrier response'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function endpoint(path: string) {
  return isolatedCheckoutBackend() ? 'http://127.0.0.1:4312/canada-post' + path : API_ROOT + path;
}

async function accessToken(settings: NonNullable<ReturnType<typeof canadaPostSettings>>) {
  const key = createHash('sha256').update(settings.clientId + ':' + settings.clientSecret).digest('hex');
  if (cachedToken?.key === key && cachedToken.expires > Date.now()) return cachedToken.token;
  if (pendingToken?.key === key) return pendingToken.promise;
  const promise = (async () => {
    const response = await fetch(endpoint('/cpc-api-native-oauth-provider/oauth2/token'), {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-IBM-Client-Id': settings.clientId, 'X-IBM-Client-Secret': settings.clientSecret },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'merchant' }),
    });
    const token = tokenSchema.parse(await readJson(response));
    cachedToken = { key, token: token.access_token, expires: Date.now() + Math.max(0, token.expires_in - 60) * 1000 };
    return token.access_token;
  })();
  pendingToken = { key, promise };
  try { return await promise; } finally { if (pendingToken?.promise === promise) pendingToken = null; }
}

export async function getCanadaPostRates(settings: NonNullable<ReturnType<typeof canadaPostSettings>>, postalCode: string, parcel: Parcel): Promise<ShippingRate[]> {
  const token = await accessToken(settings);
  const response = await fetch(endpoint('/rating/v1/prices'), {
    method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, 'Accept-Language': 'en-CA' },
    body: JSON.stringify({
      ...(settings.customerNumber ? { customerNumber: settings.customerNumber, ...(settings.contractId ? { contractId: settings.contractId } : {}), quoteType: 'commercial' } : { quoteType: 'counter' }),
      parcelCharacteristics: { weight: parcel.weightKg, dimensions: { length: parcel.lengthCm, width: parcel.widthCm, height: parcel.heightCm } },
      originPostalCode: settings.origin, destination: { domestic: { postalCode } },
      services: ['DOM.RP', 'DOM.EP', 'DOM.XP', 'DOM.PC'],
    }),
  });
  if (response.status === 401) cachedToken = null;
  const raw = z.array(z.unknown()).max(20).parse(await readJson(response));
  const rates = raw.flatMap((item): ShippingRate[] => {
    const parsed = rateSchema.safeParse(item);
    return parsed.success && parsed.data.priceDetails.due > 0 ? [{ serviceCode: parsed.data.serviceCode, name: parsed.data.serviceName,
      amountCents: parsed.data.priceDetails.due, transitDays: parsed.data.serviceStandard?.expectedTransitTime ?? null }] : [];
  });
  return rates.filter((rate, index) => rates.findIndex((other) => other.serviceCode === rate.serviceCode) === index).sort((a, b) => a.amountCents - b.amountCents);
}
