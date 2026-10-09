'use client';

import { useEffect } from 'react';

export function useScrollReveal(pathname: string | null) {
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    document.querySelectorAll('[data-reveal-group]').forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        if (child instanceof HTMLElement) child.style.setProperty('--i', String(index));
        child.setAttribute('data-reveal', '');
      });
    });
    const elements = document.querySelectorAll('[data-reveal]');
    const start = () => {
      observer?.disconnect();
      if (motion.matches || !('IntersectionObserver' in window)) {
        elements.forEach((element) => element.classList.add('is-visible'));
        return;
      }
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
      elements.forEach((element) => { if (!element.classList.contains('is-visible')) observer?.observe(element); });
    };
    start();
    motion.addEventListener('change', start);
    return () => { observer?.disconnect(); motion.removeEventListener('change', start); };
  }, [pathname]);
}
