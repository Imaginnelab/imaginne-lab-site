'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { htmlLang, localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

type Copy = Dictionary['site']['language'];
const flags: Record<Locale, string> = { en: '#flag-ca', pt: '#flag-br', es: '#flag-es' };
const order: Locale[] = ['pt', 'en', 'es'];

function Flag({ locale }: { locale: Locale }) {
  return <svg className="lang-flag" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><use href={flags[locale]} /></svg>;
}

export function LanguageList({ locale, copy, homeOnly = false }: { locale: Locale; copy: Copy; homeOnly?: boolean }) {
  const pathname = usePathname();
  const path = homeOnly ? '/' : (pathname?.replace(/^\/(?:en|pt|es)(?=\/|$)/, '') || '/');
  return (
    <div className="lang-list" role="group" aria-label={copy.group}>
      {order.map((language) => (
        <a key={language} href={localePath(language, path)} className={'lang-link' + (language === locale ? ' is-active' : '')}
          aria-current={language === locale ? 'true' : undefined} lang={htmlLang[language]} hrefLang={htmlLang[language]} data-transition="">
          <Flag locale={language} /><span>{copy[language]}</span>
        </a>
      ))}
    </div>
  );
}

export function LanguageSwitcher({ locale, copy, homeOnly = false }: { locale: Locale; copy: Copy; homeOnly?: boolean }) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const element = details.current;
    const summary = element?.querySelector('summary');
    if (!element || !summary) return;
    const close = () => { element.open = false; };
    const sync = () => summary.setAttribute('aria-expanded', String(element.open));
    const onOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && !element.contains(event.target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && element.open) { close(); summary.focus(); }
    };
    const onFocus = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && !element.contains(event.relatedTarget)) close();
    };
    const onLink = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a')) close();
    };
    element.addEventListener('toggle', sync);
    element.addEventListener('keydown', onKey);
    element.addEventListener('focusout', onFocus);
    element.addEventListener('click', onLink);
    document.addEventListener('click', onOutside);
    return () => {
      element.removeEventListener('toggle', sync);
      element.removeEventListener('keydown', onKey);
      element.removeEventListener('focusout', onFocus);
      element.removeEventListener('click', onLink);
      document.removeEventListener('click', onOutside);
    };
  }, []);
  return (
    <details className="lang-switch" ref={details}>
      <summary className="lang-toggle" aria-label={copy.toggle} aria-controls="lang-menu" aria-expanded="false">
        <Flag locale={locale} /><span className="lang-code">{copy.code}</span>
        <svg className="lang-caret" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </summary>
      <div className="lang-menu" id="lang-menu" role="group" aria-label={copy.group}>
        <LanguageList locale={locale} copy={copy} homeOnly={homeOnly} />
      </div>
    </details>
  );
}
