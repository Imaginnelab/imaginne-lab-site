export const locales = ['en', 'pt', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

// Value for <html lang> and for Intl formatters.
export const htmlLang: Record<Locale, string> = { en: 'en', pt: 'pt-BR', es: 'es' };

// Public path of a page in a locale. English lives at the root (/, /products/); Portuguese
// and Spanish keep their prefix (/pt/, /es/products/). `path` starts with "/".
export function localePath(locale: Locale, path = '/'): string {
  const clean = path === '/' ? '' : path.replace(/\/+$/, '');
  return `${locale === defaultLocale ? '' : `/${locale}`}${clean}/`;
}