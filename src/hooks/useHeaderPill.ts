'use client';

import { useEffect } from 'react';

export function useHeaderPill(pathname: string | null) {
  useEffect(() => {
    const root = document.documentElement;
    const nav = document.querySelector<HTMLElement>('.nav');
    if (!nav) return;
    const predicted = root.getAttribute('data-nav') === 'scrolled';
    let scrolled = predicted;
    let settled = !predicted || window.scrollY > 0;
    let armed = false;
    let frame = 0;
    let loadFrame = 0;
    nav.classList.toggle('is-scrolled', scrolled);
    const sync = () => {
      const y = window.scrollY;
      const next = scrolled ? y >= 8 || !settled : y > 24;
      if (next !== scrolled) { scrolled = next; nav.classList.toggle('is-scrolled', next); }
    };
    const onScroll = () => {
      settled = true;
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; sync(); });
    };
    const save = () => {
      if (settled) sync();
      try { sessionStorage.setItem('imaginne-nav-scrolled:' + location.pathname, scrolled ? '1' : '0'); } catch { /* Optional visual preference. */ }
    };
    const onVisibility = () => { if (document.hidden) save(); };
    const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
    const options = { passive: true, capture: true };
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    const onIntent = (event: Event) => {
      if (!(event instanceof KeyboardEvent) || scrollKeys.has(event.key)) arm();
    };
    let cap: ReturnType<typeof setTimeout> | undefined = undefined;
    const arm = () => {
      if (armed) return;
      armed = true;
      clearTimeout(cap);
      events.forEach((type) => window.removeEventListener(type, onIntent, options));
      nav.classList.add('is-synced');
      root.removeAttribute('data-nav');
      void nav.offsetWidth;
      nav.classList.add('is-ready');
    };
    const finish = () => { settled = true; sync(); arm(); };
    const onLoad = () => {
      loadFrame = requestAnimationFrame(() => { loadFrame = requestAnimationFrame(finish); });
    };
    sync();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', save);
    window.addEventListener('pageshow', onLoad);
    document.addEventListener('visibilitychange', onVisibility);
    events.forEach((type) => window.addEventListener(type, onIntent, options));
    cap = setTimeout(arm, 1500);
    const fallback = setTimeout(finish, 6000);
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => {
      save();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(loadFrame);
      clearTimeout(cap);
      clearTimeout(fallback);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', save);
      window.removeEventListener('pageshow', onLoad);
      window.removeEventListener('load', onLoad);
      document.removeEventListener('visibilitychange', onVisibility);
      events.forEach((type) => window.removeEventListener(type, onIntent, options));
    };
  }, [pathname]);
}
