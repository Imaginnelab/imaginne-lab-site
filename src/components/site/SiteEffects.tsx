'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useHeaderPill } from '@/hooks/useHeaderPill';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { usePageTransition } from '@/hooks/usePageTransition';
import { mountProcess } from '@/lib/site/process';

// Section anchors used to be translated; links shared with the old ones still land on the section.
const legacyAnchors: Record<string, string> = {
  'como-funciona': 'how-it-works', produtos: 'products', productos: 'products', personalizacao: 'customization',
  personalizacion: 'customization', contato: 'contact', contacto: 'contact', inicio: '',
};

export function SiteEffects() {
  const pathname = usePathname();
  useEffect(() => {
    const upgrade = () => {
      const old = decodeURIComponent(window.location.hash.slice(1));
      if (!Object.hasOwn(legacyAnchors, old)) return;
      const anchor = legacyAnchors[old];
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + (anchor ? '#' + anchor : ''));
      if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
    };
    upgrade();
    window.addEventListener('hashchange', upgrade);
    return () => window.removeEventListener('hashchange', upgrade);
  }, [pathname]);
  useHeaderPill(pathname);
  useScrollReveal(pathname);
  usePageTransition(pathname);
  useEffect(() => {
    const processes = Array.from(document.querySelectorAll<HTMLElement>('[data-process]')).map(mountProcess);
    return () => processes.forEach((process) => process?.dispose());
  }, [pathname]);
  return null;
}
