'use client';
import { useEffect, useRef } from 'react';
import { validatedModel, type ModelItem } from '@/lib/admin/client/storage';
export function ModelPreview({ item, label }: { item: ModelItem; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false, url: string | null = null, viewer: HTMLElement | null = null;
    const abort = new AbortController();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const rotate = () => {
      if (!viewer) return;
      if (!document.hidden && !motion.matches) viewer.setAttribute('auto-rotate', '');
      else viewer.removeAttribute('auto-rotate');
    };
    document.addEventListener('visibilitychange', rotate);
    motion.addEventListener('change', rotate);
    void (async () => {
      // Saved models also pass SEC-002 before the viewer sees them.
      const blob = await validatedModel(item, abort.signal);
      if (disposed) return;
      await import('@google/model-viewer');
      if (disposed) return;
      const Viewer = customElements.get('model-viewer') as (CustomElementConstructor & { modelCacheSize?: number }) | undefined;
      if (Viewer) Viewer.modelCacheSize = 0;
      url = URL.createObjectURL(blob);
      viewer = document.createElement('model-viewer');
      viewer.setAttribute('src', url); viewer.setAttribute('alt', label);
      const attributes = { 'camera-controls': '', 'disable-pan': '', 'disable-zoom': '', 'interaction-prompt': 'none',
        'auto-rotate-delay': '1500', 'rotation-per-second': '18deg', 'shadow-intensity': '0', exposure: '1', 'environment-image': 'neutral', loading: 'eager' };
      Object.entries(attributes).forEach(([key, value]) => viewer!.setAttribute(key, value));
      element.append(viewer);
      rotate();
    })().catch(() => { /* The form can still remove an unavailable old model. */ });
    return () => {
      disposed = true; abort.abort();
      document.removeEventListener('visibilitychange', rotate); motion.removeEventListener('change', rotate);
      viewer?.removeAttribute('auto-rotate');
      viewer?.removeAttribute('src'); viewer?.remove();
      if (url) URL.revokeObjectURL(url);
    };
  }, [item, label]);
  return <div ref={host} className="model-preview" />;
}
