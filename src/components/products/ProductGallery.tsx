'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import type { ProductDTO } from '@/lib/products/types';
import { ProductPhoto } from '@/components/catalogue/ProductPhoto';
import { ModelMedia } from '@/components/catalogue/ModelMedia';
import { watchMedia } from '@/components/catalogue/media-visibility';
import { ProductZoom, paintedRect } from './ProductZoom';

const noInterest = () => {};
export function ProductGallery({ product, locale, copy, detail }: {
  product: ProductDTO; locale: Locale; copy: Dictionary['store']['card'];
  detail: Pick<Dictionary['store']['detail'], 'imageError' | 'previous' | 'next'>;
}) {
  const photo = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [hasModel, setHasModel] = useState(Boolean(product.modelUrl));
  const [ready, setReady] = useState(false);
  const [visited, setVisited] = useState(() => new Set([0]));
  const modelSelected = hasModel && index === product.photos.length;
  const count = product.photos.length + (hasModel ? 1 : 0);
  const unsupported = useCallback(() => { setHasModel(false); setIndex(0); }, []);
  useEffect(() => {
    if (photo.current) return watchMedia(photo.current);
  }, []);
  function show(next: number) {
    const target = (next + count) % count;
    setIndex(target);
    if (target === product.photos.length) setReady(false);
    if (target < product.photos.length) setVisited((current) => new Set([...current, target]));
  }
  // A click (or Enter) on the photo opens it large in the middle of the screen.
  const [zoom, setZoom] = useState<{ src: string; from: DOMRect; size: { width: number; height: number } } | null>(null);
  function shownImage() {
    const src = product.photos[index];
    return [...photo.current?.querySelectorAll('img') ?? []].find((image) => image.getAttribute('src') === src && image.complete && image.naturalWidth > 0) ?? null;
  }
  function openZoom() {
    const image = modelSelected ? null : shownImage();
    if (image) setZoom({ src: image.currentSrc || image.src, from: paintedRect(image), size: { width: image.naturalWidth, height: image.naturalHeight } });
  }
  const closeZoom = useCallback(() => setZoom(null), []);
  return <div className="product-gallery" role="group" aria-label={copy.views}>
    <div className="product-thumbnails">
      {product.photos.map((src, position) => <button key={src} type="button" className="product-thumbnail" aria-pressed={index === position}
        aria-label={`${copy.photo} ${position + 1}: ${product.name}`} onClick={() => show(position)}
        onPointerEnter={(event) => { if (event.pointerType === 'mouse' && index !== position) show(position); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={60} height={60} loading="lazy" />
      </button>)}
      {hasModel ? <button type="button" className="product-thumbnail product-thumbnail-model" aria-pressed={modelSelected}
        onClick={() => show(product.photos.length)} aria-label={copy.openModel}>{copy.modelBadge}</button> : null}
    </div>
    <div className="product-gallery-main">
      <div ref={photo} className={'products-photo product-detail-photo' + (modelSelected ? ' products-model-active' : '')}
        tabIndex={0} role="group" aria-label={copy.views + ': ' + product.name}
        onPointerDown={(event) => {
          if (modelSelected || !event.isPrimary || event.button !== 0) return;
          gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { gesture.current = null; }}
        onPointerUp={(event) => {
          const start = gesture.current; gesture.current = null;
          if (!start || start.id !== event.pointerId || modelSelected) return;
          const dx = event.clientX - start.x, dy = event.clientY - start.y;
          if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.25) show(index + (dx < 0 ? 1 : -1));
          else if (Math.hypot(dx, dy) < 8) openZoom();
        }}
        onDragStart={(event) => { if (!modelSelected) event.preventDefault(); }}
        onKeyDown={(event) => {
          // Arrow keys inside the 3D viewer rotate the model rather than changing media.
          if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          if (event.key === 'Enter' && !modelSelected) { event.preventDefault(); openZoom(); return; }
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          show(event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : index + (event.key === 'ArrowRight' ? 1 : -1));
        }}>
        {product.photos.map((src, position) => visited.has(position) ? <ProductPhoto key={src} src={src} name={product.name}
          priority={position === 0} loadingLabel={copy.loadingImage} errorLabel={detail.imageError}
          visible={modelSelected ? position === 0 && !ready : index === position} active={!modelSelected && index === position} /> : null)}
        {modelSelected && product.modelUrl ? <ModelMedia photo={photo} selected url={product.modelUrl} bytes={product.modelBytes}
          poster={product.photos[0]} name={product.name} locale={locale} copy={copy} interest={noInterest}
          onReady={setReady} onUnsupported={unsupported} /> : null}
      </div>
      {count > 1 ? <div className="product-gallery-controls">
        <button type="button" className="products-gallery-arrow" onClick={() => show(index - 1)} aria-label={detail.previous}>←</button>
        <span aria-live="polite">{modelSelected ? copy.modelBadge : `${index + 1} / ${product.photos.length}`}</span>
        <button type="button" className="products-gallery-arrow" onClick={() => show(index + 1)} aria-label={detail.next}>→</button>
      </div> : null}
      <p className="products-status" aria-live="polite">{modelSelected ? copy.modelBadge : `${copy.photo} ${index + 1} / ${product.photos.length}`}</p>
    </div>
    {zoom ? <ProductZoom src={zoom.src} alt={`${copy.photo} ${index + 1}: ${product.name}`} size={zoom.size} from={zoom.from}
      origin={() => { const image = shownImage(); return image ? paintedRect(image) : null; }} onClosed={closeZoom} /> : null}
  </div>;
}
