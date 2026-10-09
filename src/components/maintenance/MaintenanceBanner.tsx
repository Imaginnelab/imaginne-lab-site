'use client';

import { useEffect, useRef } from 'react';

// Thin fixed strip telling an administrator that the public cannot see the site right now.
// The existing CSS reserves room for it through an attribute and a variable on <html>.
export function MaintenanceBanner({ label, text, link, href }: { label: string; text: string; link: string; href: string }) {
  const banner = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const fit = () => { if (banner.current) root.style.setProperty('--maintenance-banner', `${banner.current.offsetHeight}px`); };
    root.setAttribute('data-maintenance', 'admin');
    fit();
    window.addEventListener('resize', fit, { passive: true });
    return () => {
      window.removeEventListener('resize', fit);
      root.removeAttribute('data-maintenance');
      root.style.removeProperty('--maintenance-banner');
    };
  }, []);

  return (
    <aside ref={banner} className="maintenance-banner" aria-label={label}>
      <span>{text}</span>
      <a href={href}>{link}</a>
    </aside>
  );
}
