import 'server-only';

import type { Metadata } from 'next';
import { locales, localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

const origin = 'https://www.imaginnelab.com';
export function siteMetadata(locale: Locale, copy: Dictionary['metadata'], page: 'home' | 'products' = 'home'): Metadata {
  const path = page === 'home' ? '/' : '/products';
  const title = page === 'home' ? copy.title : copy.products.title;
  const description = page === 'home' ? copy.description : copy.products.description;
  const ogLocale = page === 'home' ? copy.ogLocale : copy.products.ogLocale;
  const url = origin + localePath(locale, path);
  return {
    title, description,
    alternates: {
      canonical: url,
      languages: {
        en: origin + localePath('en', path),
        'pt-BR': origin + localePath('pt', path),
        es: origin + localePath('es', path),
        'x-default': origin + localePath('en', path),
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website', siteName: 'Imaginne Lab', title, description, url, locale: ogLocale,
      alternateLocale: locales.filter((value) => value !== locale).map((value) => value === 'pt' ? 'pt_BR' : value === 'es' ? 'es_ES' : page === 'home' ? 'en_US' : 'en_CA'),
      images: [{ url: origin + '/assets/img/hero-vase.jpg', width: 1086, height: 1448, alt: copy.imageAlt }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [origin + '/assets/img/hero-vase.jpg'] },
  };
}

export function organizationJsonLd(copy: Dictionary['metadata']) {
  // Escaping < prevents a translated string from closing the inert JSON script element.
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Organization',
    name: 'Imaginne Lab', alternateName: 'ImaginneLab', url: origin + '/',
    logo: origin + '/assets/img/logo-icon.svg', image: origin + '/assets/img/hero-vase.jpg',
    description: copy.description, sameAs: ['https://www.instagram.com/imaginne.lab/'],
  }).replace(/</g, '\\u003c');
}
