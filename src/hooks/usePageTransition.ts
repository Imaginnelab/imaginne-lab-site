'use client';

import { useEffect } from 'react';

export function usePageTransition(pathname: string | null) {
  useEffect(() => {
    const root = document.documentElement;
    const overlay = document.getElementById('page-transition');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timers: ReturnType<typeof setTimeout>[] = [];
    const frames: number[] = [];
    let leaving = false;
    const later = (callback: () => void, delay: number) => timers.push(setTimeout(callback, delay));
    const nextFrame = (callback: () => void) => frames.push(requestAnimationFrame(callback));
    const clear = () => {
      timers.forEach(clearTimeout);
      frames.forEach(cancelAnimationFrame);
      root.classList.remove('incoming-transition', 'pending-intro');
      overlay?.classList.remove('is-visible', 'is-writing', 'is-fading');
    };
    const read = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };
    const remove = () => { try { sessionStorage.removeItem('imaginne-transition'); } catch { /* Storage is optional. */ } };
    if (!overlay || motion.matches) { remove(); clear(); return; }
    if (read('imaginne-transition') === 'out') {
      remove();
      overlay.classList.add('is-visible');
      nextFrame(() => nextFrame(() => {
        overlay.classList.add('is-fading');
        root.classList.remove('incoming-transition');
      }));
      later(() => overlay.classList.remove('is-visible', 'is-fading'), 500);
    } else if (root.classList.contains('pending-intro')) {
      try { localStorage.setItem('imaginne-intro-seen', '1'); } catch { /* Still finish the intro. */ }
      nextFrame(() => overlay.classList.add('is-visible', 'is-writing'));
      later(() => {
        overlay.classList.remove('is-writing');
        overlay.classList.add('is-fading');
        root.classList.remove('pending-intro');
      }, 1250);
      later(() => overlay.classList.remove('is-visible', 'is-fading'), 1700);
    }
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || motion.matches) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-transition]') : null;
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const url = new URL(link.href, location.href);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      event.preventDefault();
      if (leaving) return;
      leaving = true;
      overlay.classList.remove('is-fading');
      overlay.classList.add('is-visible', 'is-writing');
      try { sessionStorage.setItem('imaginne-transition', 'out'); } catch { /* Navigation still works. */ }
      later(() => location.assign(url.href), 1250);
    };
    const onMotion = () => { if (motion.matches && !leaving) { remove(); clear(); } };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) { leaving = false; remove(); clear(); } };
    document.addEventListener('click', onClick);
    window.addEventListener('pageshow', onPageShow);
    motion.addEventListener('change', onMotion);
    return () => {
      clear();
      document.removeEventListener('click', onClick);
      window.removeEventListener('pageshow', onPageShow);
      motion.removeEventListener('change', onMotion);
    };
  }, [pathname]);
}
