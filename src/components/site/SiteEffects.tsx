'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useHeaderPill } from '@/hooks/useHeaderPill';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { usePageTransition } from '@/hooks/usePageTransition';
import { mountProcess } from '@/lib/site/process';

export function SiteEffects() {
  const pathname = usePathname();
  useHeaderPill(pathname);
  useScrollReveal(pathname);
  usePageTransition(pathname);
  useEffect(() => {
    const processes = Array.from(document.querySelectorAll<HTMLElement>('[data-process]')).map(mountProcess);
    return () => processes.forEach((process) => process?.dispose());
  }, [pathname]);
  return null;
}
