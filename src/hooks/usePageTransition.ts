'use client';

import { useEffect } from 'react';

export function usePageTransition(pathname: string | null) {
  useEffect(() => {
    const root = document.documentElement;
    const overlay = document.getElementById('page-transition');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timers: ReturnType<typeof setTimeout>[] = [];
    const frames: number[] = [];
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
    const onMotion = () => { if (motion.matches) { remove(); clear(); } };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) { remove(); clear(); } };
    window.addEventListener('pageshow', onPageShow);
    motion.addEventListener('change', onMotion);
    return () => {
      clear();
      window.removeEventListener('pageshow', onPageShow);
      motion.removeEventListener('change', onMotion);
    };
  }, [pathname]);
}
