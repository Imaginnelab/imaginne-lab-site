'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import type { ProductDTO } from '@/lib/products/types';
import { ModelMedia } from './ModelMedia';
import { ArrowButton } from './ArrowButton';
import { trackView } from './track-view';
import { watchMedia } from './media-visibility';

type Copy = Dictionary['store']['card'];
function Photo({ src, name, priority, visible, active, loadingLabel }: {
  src: string; name: string; priority: boolean; visible: boolean; active: boolean; loadingLabel: string;
}) {
  const image = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'failed'>('loading');
  useEffect(() => {
    const element = image.current;
    if (!element?.complete) return;
    let disposed = false;
    void element.decode().then(() => { if (!disposed) setPhase('ready'); }, () => { if (!disposed) setPhase('failed'); });
    return () => { disposed = true; };
  }, [src]);
  return (
    <>
      {/* Preserve the original gallery markup and native lazy images. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={image} className="products-image" src={src} alt={name} width={640} height={480}
        loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" draggable={false}
        hidden={!visible || phase === 'failed'} onLoad={() => setPhase('ready')} onError={() => setPhase('failed')} />
      <div className="products-image-loader" hidden={!active || phase !== 'loading'}>
        <span className="products-media-spinner" aria-hidden="true" /><span className="products-status" role="status">{loadingLabel}</span>
      </div>
    </>
  );
}

export function ProductCard({ product, locale, copy, priority = false }: {
  product: ProductDTO; locale: Locale; copy: Copy; priority?: boolean;
}) {
  const photo = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [hasModel, setHasModel] = useState(Boolean(product.modelUrl));
  const [modelReady, setModelReady] = useState(false);
  const [visited, setVisited] = useState(() => new Set([0]));
  const helpId = useId();
  const offset = hasModel ? 1 : 0;
  const count = product.photos.length + offset;
  const selectedModel = hasModel && index === 0;
  const gallery = count > 1;
  const interest = useCallback(() => trackView(product.id), [product.id]);
  const unsupported = useCallback(() => { setHasModel(false); setIndex(0); }, []);
  useEffect(() => {
    const element = photo.current;
    if (!element) return;
    return watchMedia(element);
  }, []);
  function show(next: number) {
    if (!count) return;
    const target = (next + count) % count;
    setIndex(target);
    if (target >= offset) setVisited((current) => new Set([...current, target - offset]));
    interest();
  }
  const selectedPhoto = selectedModel ? 0 : index - offset;
  const label = (hasModel ? copy.views : copy.photos) + ': ' + product.name;
  return (
    <li className={'products-card' + (product.featured ? ' products-featured' : '')} onClick={interest}>
      <div ref={photo} className={'products-photo' + (gallery ? ' products-gallery' : '') + (selectedModel ? ' products-model-active' : '')}
        tabIndex={gallery ? 0 : undefined} role={gallery ? 'group' : undefined} aria-label={gallery ? label : undefined}
        aria-describedby={gallery ? helpId : undefined}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          if (event.key === 'Home') show(0);
          else if (event.key === 'End') show(count - 1);
          else show(index + (event.key === 'ArrowRight' ? 1 : -1));
        }}>
        {product.photos.map((src, position) => visited.has(position) ? (
          <Photo key={src} src={src} name={product.name} priority={priority && position === 0} loadingLabel={copy.loadingImage}
            visible={selectedModel ? position === 0 && !modelReady : selectedPhoto === position} active={!selectedModel && selectedPhoto === position} />
        ) : null)}
        {hasModel && product.modelUrl ? <ModelMedia photo={photo} selected={selectedModel} url={product.modelUrl} bytes={product.modelBytes}
          poster={product.photos[0]} name={product.name} locale={locale} copy={copy} interest={interest} onReady={setModelReady} onUnsupported={unsupported} /> : null}
        {hasModel ? <span className="products-model-badge" aria-hidden="true">{copy.modelBadge}</span> : null}
        {gallery ? <>
          <span className="products-status" id={helpId}>{hasModel ? copy.modelHelp : copy.photoHelp}</span>
          <div className="products-gallery-controls">
            <ArrowButton gallery aria-label={(hasModel ? copy.previousView : copy.previousPhoto) + ': ' + product.name} onClick={() => show(index - 1)} />
            <span className="products-gallery-count" aria-live="polite" aria-atomic="true">
              {selectedModel ? copy.modelBadge : hasModel ? copy.view : copy.photo} {index + 1} / {count}
            </span>
            <ArrowButton gallery aria-label={(hasModel ? copy.nextView : copy.nextPhoto) + ': ' + product.name} onClick={() => show(index + 1)} />
          </div>
        </> : null}
      </div>
      <div className="products-content">
        <h3 className="products-name">{product.name}{product.featured ? <span className="products-featured-badge" role="img" aria-label={copy.mostViewed}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9Z" /></svg>
        </span> : null}</h3>
        <p className="products-description">{product.description}</p>
        <p className="products-price">{product.price ?? copy.request}</p>
        <a className="products-order" href="https://www.instagram.com/imaginne.lab/" target="_blank" rel="noopener"
          aria-label={copy.order + ': ' + product.name}>{copy.order}</a>
      </div>
    </li>
  );
}
