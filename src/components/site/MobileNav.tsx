'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function MobileNav({ label }: { label: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const toggle = button.current;
    const panel = document.getElementById('mobile-panel');
    if (!toggle || !panel) return;
    const setOpen = (open: boolean) => {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      panel.inert = !open;
    };
    setOpen(false);
    const onToggle = () => setOpen(!document.body.classList.contains('nav-open'));
    const onLink = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
        setOpen(false);
        toggle.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 901px)');
    const onResize = () => { if (desktop.matches) setOpen(false); };
    toggle.addEventListener('click', onToggle);
    panel.addEventListener('click', onLink);
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onResize);
    return () => {
      setOpen(false);
      toggle.removeEventListener('click', onToggle);
      panel.removeEventListener('click', onLink);
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onResize);
    };
  }, [pathname]);
  return (
    <button ref={button} className="nav-burger" type="button" aria-controls="mobile-panel" aria-expanded="false" aria-label={label}>
      <svg className="icon" viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"></path></svg>
    </button>
  );
}
