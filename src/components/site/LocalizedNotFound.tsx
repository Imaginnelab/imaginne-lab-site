'use client';
import { NavigationLink } from '@/components/navigation/NavigationLink';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { isLocale, localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { FlagSprite } from './FlagSprite';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SiteEffects } from './SiteEffects';

type Copy = { error: Dictionary['notFound']; language: Dictionary['site']['language']; theme: Dictionary['site']['theme']; brand: string };

export function LocalizedNotFound({ copies }: { copies: Record<Locale, Copy> }) {
  // not-found has no params prop; useParams also resolves during the initial App Router render.
  const params = useParams<{ locale?: string }>();
  const locale = params.locale && isLocale(params.locale) ? params.locale : 'en';
  const copy = copies[locale];
  useEffect(() => { document.title = copy.error.title; }, [copy.error.title]);
  return (
    <>
      <FlagSprite />
      <header className="nav"><div className="wrap">
        <NavigationLink className="brand" href={localePath(locale)}><img src="/assets/img/logo-icon.svg" alt={copy.brand} /><span>{copy.brand}<small>{copy.error.tagline}</small></span></NavigationLink>
        <div className="nav-actions"><LanguageSwitcher locale={locale} copy={copy.language} homeOnly /></div>
      </div></header>
      <main><section className="error-page"><div className="wrap">
        <div className="error-icon"><svg className="icon" viewBox="0 0 256 256"><path fill="currentColor" d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44L128,120,47.66,76ZM40,90l80,43.78v85.79L40,175.82Zm96,129.57V133.82L216,90v85.78Z"></path></svg></div>
        <span className="eyebrow">{copy.error.eyebrow}</span>
        <h1 className="heading">{copy.error.heading}</h1>
        <p className="lede">{copy.error.lede}</p>
        <NavigationLink className="btn btn-primary" href={localePath(locale)} id="error-home-link"><span>{copy.error.cta}</span><svg className="icon" viewBox="0 0 256 256"><path fill="currentColor" d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"></path></svg></NavigationLink>
      </div></section></main>
      <SiteEffects />
    </>
  );
}
