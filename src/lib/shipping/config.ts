import 'server-only';
import { postalCodeSchema } from './schema';

export function canadaPostSettings() {
  // Only Rating is implemented. The API hostname contains /prod/ even for Test apps;
  // the app's credentials, not a different hostname, select Canada Post's test data.
  if (process.env.CANADA_POST_ENABLED !== 'true' || process.env.CANADA_POST_APP_TYPE !== 'test' || process.env.VERCEL === '1') return null;
  const clientId = process.env.CANADA_POST_API_KEY ?? '';
  const clientSecret = process.env.CANADA_POST_API_SECRET ?? '';
  const origin = postalCodeSchema.safeParse(process.env.CANADA_POST_ORIGIN_POSTAL_CODE);
  const paddingCm = Number(process.env.CANADA_POST_PADDING_CM ?? '2');
  const packagingGrams = Number(process.env.CANADA_POST_PACKAGING_GRAMS ?? '100');
  const customerNumber = process.env.CANADA_POST_CUSTOMER_NUMBER ?? '';
  const contractId = process.env.CANADA_POST_CONTRACT_ID ?? '';
  if (!clientId || !clientSecret || /[\r\n]/.test(clientId + clientSecret) || !origin.success) return null;
  if (!Number.isFinite(paddingCm) || paddingCm < 0 || paddingCm > 20 || !Number.isFinite(packagingGrams) || packagingGrams < 0 || packagingGrams > 5000) return null;
  if ((customerNumber && !/^\d{1,10}$/.test(customerNumber)) || (contractId && (!customerNumber || !/^\d{1,10}$/.test(contractId)))) return null;
  return { clientId, clientSecret, origin: origin.data, paddingCm, packagingGrams, customerNumber, contractId };
}
