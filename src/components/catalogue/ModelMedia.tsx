'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import type { ModelController, ModelState } from './model-runtime';

type Copy = Dictionary['store']['card'];
export function ModelMedia({ photo, selected, url, bytes, poster, name, locale, copy, interest, onReady, onUnsupported }: {
  photo: RefObject<HTMLDivElement | null>; selected: boolean; url: string; bytes: number | null;
  poster: string; name: string; locale: Locale; copy: Copy; interest: () => void;
  onReady: (ready: boolean) => void; onUnsupported: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ModelController | null>(null);
  const currentSelected = useRef(selected);
  const [state, setState] = useState<ModelState>({ phase: 'idle', progress: null, manual: false, explicit: false });
  useEffect(() => {
    currentSelected.current = selected;
    controller.current?.select(selected);
  }, [selected]);
  useEffect(() => {
    const container = host.current;
    const picture = photo.current;
    if (!container || !picture) return;
    let disposed = false;
    void import('./model-runtime').then(({ mountProductModel }) => {
      if (disposed) return;
      controller.current = mountProductModel({
        photo: picture, host: container, url, bytes, poster, name, alt: copy.modelAlt, interest,
        notify(next) {
          if (disposed) return;
          setState(next);
          onReady(next.phase === 'ready');
          if (next.phase === 'unsupported') onUnsupported();
        },
      });
      controller.current.select(currentSelected.current);
    }).catch(() => { if (!disposed) onUnsupported(); });
    return () => { disposed = true; controller.current?.dispose(); controller.current = null; };
  }, [photo, url, bytes, poster, name, copy.modelAlt, interest, onReady, onUnsupported]);
  const pending = state.phase === 'queued' || state.phase === 'loading' || state.phase === 'preparing';
  const size = bytes && bytes <= 15 * 1024 * 1024 ? copy.modelSize.replace('{size}',
    new Intl.NumberFormat({ en: 'en-CA', pt: 'pt-BR', es: 'es-ES' }[locale], { maximumFractionDigits: 1 }).format(bytes / 1_000_000)) : '';
  const message = state.phase === 'queued' ? copy.queuedModel : state.phase === 'preparing' ? copy.preparingModel :
    state.phase === 'loading' ? copy.loadingModel + (state.progress === null ? '' : ' ' + Math.floor(state.progress / 10) * 10 + '%') :
    state.phase === 'error' ? copy.errorModel : state.phase === 'ready' ? copy.readyModel : state.manual ? '' : copy.waitingModel;
  return (
    <div hidden={!selected}>
      <div ref={host} />
      <div className="products-model-prompt" hidden={state.phase === 'ready'}>
        <span className="products-media-spinner" aria-hidden="true" hidden={!pending && state.manual} />
        <button className="products-model-open" type="button" aria-label={copy.openModel + ': ' + name + size}
          hidden={pending ? !state.explicit : !state.manual} disabled={pending} aria-busy={pending ? 'true' : undefined}
          onClick={() => { interest(); controller.current?.open(); }}>{pending ? copy.loadingModel : copy.openModel + size}</button>
        <progress className="products-model-progress" max={100} value={state.progress ?? undefined} hidden={!pending} aria-label={copy.loadingModel} />
        <span className="products-model-message" role="status" aria-live="polite">{message}</span>
      </div>
      <span className="products-status" role="status" aria-live="polite">{state.phase === 'ready' ? copy.readyModel : ''}</span>
    </div>
  );
}
