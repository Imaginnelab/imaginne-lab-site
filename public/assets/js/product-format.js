// Shared, DOM-free helpers for store products (used by the admin and the home carousel).

// The store sells in Canadian dollars only; the amount is never converted per language.
export const CURRENCY = 'CAD';

const LOCALES = { pt: 'pt-BR', en: 'en-CA', es: 'es-ES' };
const LANGS = Object.keys(LOCALES);
const BUCKET_PATH = '/storage/v1/object/public/product-images/';
const MODEL_BUCKET_PATH = '/storage/v1/object/public/product-models/';
// A cover plus up to five extra photos.
export const MAX_PHOTOS = 6;

// Price of a product in cents, or null when it is "on request".
export function priceCents(product) {
  const cents = product?.price_cad_cents;
  return Number.isInteger(cents) ? cents : null;
}

// "CA$ 49,90" (pt), "$49.90 CAD" (en), "49,90 CAD" (es). Always names the currency: a bare "$"
// would read as the visitor's own dollar. Empty string when there is no price.
export function formatPrice(cents, lang) {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '';
  const text = new Intl.NumberFormat(LOCALES[lang] || LOCALES.en, {
    style: 'currency', currency: CURRENCY, currencyDisplay: 'symbol',
  }).format(cents / 100);
  return text.includes('CA') ? text : `${text} ${CURRENCY}`;
}

// Reads what a person types as a price and returns integer cents.
// '' -> null (no price); anything that is not a plain non-negative amount -> NaN.
// Accepts "49,90", "49.90", "1.234,56", "1,234.56", "1 234,56", with an optional $, CA$ or CAD.
export function parsePrice(text) {
  if (text === null || text === undefined) return null;
  let value = String(text).replace(/[\s  ]/g, '');
  if (value === '') return null;
  value = value.replace(/^(?:CA\$|CAD|\$)/i, '').replace(/(?:CA\$|CAD|\$)$/i, '');
  if (!/^\d[\d.,]*$/.test(value)) return NaN;

  const lastDot = value.lastIndexOf('.');
  const lastComma = value.lastIndexOf(',');
  let whole = value;
  let fraction = '';
  if (lastDot !== -1 && lastComma !== -1) {
    // Both present: the last one is the decimal mark, the other groups thousands.
    const decimalAt = Math.max(lastDot, lastComma);
    const group = lastDot > lastComma ? ',' : '.';
    whole = value.slice(0, decimalAt);
    fraction = value.slice(decimalAt + 1);
    if (fraction.includes(group) || !isGrouped(whole, group)) return NaN;
    whole = whole.split(group).join('');
  } else if (lastDot !== -1 || lastComma !== -1) {
    const mark = lastDot !== -1 ? '.' : ',';
    const parts = value.split(mark);
    if (parts.length === 2 && parts[1].length <= 2) {
      // "49,9" / "49.90": a decimal mark.
      [whole, fraction] = parts;
    } else if (isGrouped(value, mark)) {
      // "1.234" / "1,234,567": thousands only.
      whole = parts.join('');
    } else {
      return NaN;
    }
  }
  if (!/^\d+$/.test(whole) || !/^\d{0,2}$/.test(fraction)) return NaN;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : NaN;
}

function isGrouped(digits, mark) {
  const groups = digits.split(mark);
  return /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every((group) => /^\d{3}$/.test(group));
}

// Name or description in the given language, falling back to Portuguese.
export function localized(product, field, lang) {
  if (field !== 'name' && field !== 'description') return '';
  const pick = (code) => {
    const value = product?.[`${field}_${code}`];
    return typeof value === 'string' && value.trim() ? value : '';
  };
  return (LANGS.includes(lang) ? pick(lang) : '') || pick('pt');
}

// Public URL of a product photo. imagePath is the object path inside the bucket, never a URL.
export function imageUrl(baseUrl, imagePath) {
  return publicUrl(baseUrl, BUCKET_PATH, imagePath);
}

// Public URL of a product's 3D model (GLB) in the product-models bucket. Empty unless the path
// follows the same rule the database enforces, so nothing else is ever handed to the 3D viewer.
export function modelUrl(baseUrl, modelPath) {
  if (typeof modelPath !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,195}\.glb$/.test(modelPath) || modelPath.includes('..')) return '';
  return publicUrl(baseUrl, MODEL_BUCKET_PATH, modelPath);
}

function publicUrl(baseUrl, bucketPath, objectPath) {
  if (typeof baseUrl !== 'string' || typeof objectPath !== 'string' || !objectPath) return '';
  const path = objectPath.split('/').map(encodeURIComponent).join('/');
  return `${baseUrl.replace(/\/+$/, '')}${bucketPath}${path}`;
}

// Every photo of a product in display order: the cover (image_path) first, then the extras.
export function imagePaths(product) {
  const isPath = (value) => typeof value === 'string' && value !== '';
  const extras = Array.isArray(product?.extra_image_paths) ? product.extra_image_paths : [];
  return [product?.image_path, ...extras].filter(isPath).slice(0, MAX_PHOTOS);
}

// "1,2 MB" / "340 KB" in the number style of the language.
export function formatFileSize(bytes, lang) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const number = (value, digits) => new Intl.NumberFormat(LOCALES[lang] || LOCALES.en, { maximumFractionDigits: digits }).format(value);
  if (bytes < 1024) return `${number(bytes, 0)} B`;
  if (bytes < 1024 * 1024) return `${number(bytes / 1024, 0)} KB`;
  return `${number(bytes / (1024 * 1024), 1)} MB`;
}

// Name for a duplicated product: the original plus a suffix, never longer than the limit.
export function copyName(name, suffix, max = 120) {
  const tail = Array.from(String(suffix ?? '')).slice(0, max);
  const head = Array.from(String(name ?? '').trim()).slice(0, max - tail.length);
  return (head.join('').trimEnd() + tail.join('')).trim();
}
