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
    void (async () => {
      // Saved models also pass SEC-002 before the viewer sees them.
      const blob = await validatedModel(item, abort.signal);
      if (disposed) return;
      await import('@google/model-viewer');
      if (disposed) return;
      url = URL.createObjectURL(blob);
      viewer = document.createElement('model-viewer');
      viewer.setAttribute('src', url); viewer.setAttribute('alt', label);
      viewer.setAttribute('camera-controls', ''); viewer.setAttribute('shadow-intensity', '0');
      viewer.setAttribute('environment-image', 'neutral'); viewer.setAttribute('loading', 'eager');
      element.append(viewer);
    })().catch(() => { /* The form can still remove an unavailable old model. */ });
    return () => {
      disposed = true; abort.abort();
      viewer?.removeAttribute('src'); viewer?.remove();
      if (url) URL.revokeObjectURL(url);
    };
  }, [item, label]);
  return <div ref={host} className="model-preview" />;
}
