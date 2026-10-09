'use client';

import { useEffect, useRef } from 'react';

export function LionModel({ alt }: { alt: string }) {
  const model = useRef<HTMLElement>(null);
  useEffect(() => {
    const viewer = model.current;
    if (!viewer) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let visible = !('IntersectionObserver' in window);
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: IntersectionObserver | undefined;
    const rotate = () => {
      if (visible && !document.hidden && !motion.matches) viewer.setAttribute('auto-rotate', '');
      else viewer.removeAttribute('auto-rotate');
    };
    const stop = () => {
      observer?.disconnect();
      motion.removeEventListener('change', rotate);
      document.removeEventListener('visibilitychange', rotate);
      viewer.removeAttribute('auto-rotate');
    };
    const start = async () => {
      if (disposed) return;
      try {
        // The custom-element package must never run during SSR or join the initial JS chunk.
        await import('@google/model-viewer');
        if (disposed) return;
        viewer.setAttribute('src', '/assets/3d/lion-head/lion_head.glb');
        if ('IntersectionObserver' in window) {
          observer = new IntersectionObserver((entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            rotate();
          }, { threshold: 0.01 });
          observer.observe(viewer);
        }
        motion.addEventListener('change', rotate);
        document.addEventListener('visibilitychange', rotate);
        viewer.addEventListener('error', stop, { once: true });
        rotate();
      } catch { stop(); /* Keep the existing frame if WebGL/the module is unavailable. */ }
    };
    const schedule = () => {
      if (disposed) return;
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(() => { void start(); }, { timeout: 2000 });
      else timer = setTimeout(() => { void start(); }, 0);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
      disposed = true;
      window.removeEventListener('load', schedule);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      clearTimeout(timer);
      viewer.removeEventListener('error', stop);
      stop();
    };
  }, []);
  return (
    <model-viewer ref={model} id="hero-bust" data-hero-model="" data-model-src="/assets/3d/lion-head/lion_head.glb"
      alt={alt} camera-controls="" disable-pan="" disable-zoom="" interaction-prompt="none"
      auto-rotate-delay="1500" rotation-per-second="18deg" shadow-intensity="0" exposure="1"
      environment-image="neutral" camera-orbit="0deg 90deg 105%" min-camera-orbit="auto 55deg auto"
      max-camera-orbit="auto 105deg auto" loading="lazy" reveal="auto" />
  );
}
