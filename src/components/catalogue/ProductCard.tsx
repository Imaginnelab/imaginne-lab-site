'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { NavigationLink as Link } from '@/components/navigation/NavigationLink';
import type { Dictionary } from '@/i18n/dictionaries';
import { localePath, type Locale } from '@/i18n/config';
import type { ProductDTO } from '@/lib/products/types';
import { ModelMedia } from './ModelMedia';
import { ArrowButton } from './ArrowButton';
import { trackView } from './track-view';
import { watchMedia } from './media-visibility';
import { ProductPhoto } from './ProductPhoto';

type Copy = Dictionary['store']['card'];
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
          <ProductPhoto key={src} src={src} name={product.name} priority={priority && position === 0} loadingLabel={copy.loadingImage}
            visible={selectedModel ? position === 0 && !modelReady : selectedPhoto === position} active={!selectedModel && selectedPhoto === position} />
        ) : null)}
        {!selectedModel || !modelReady ? <Link className="products-photo-link" href={localePath(locale, '/products/' + product.id)} prefetch={false}
          aria-label={copy.details + ': ' + product.name} /> : null}
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
        <h3 className="products-name"><Link href={localePath(locale, '/products/' + product.id)} prefetch={false}>{product.name}</Link>{product.featured ? <span className="products-featured-badge" role="img" aria-label={copy.mostViewed}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9Z" /></svg>
        </span> : null}</h3>
        <p className="products-description">{product.description}</p>
        <p className="products-price">{product.price ?? copy.request}</p>
        <Link className="products-order" href={localePath(locale, '/products/' + product.id)} prefetch={false}
          aria-label={copy.details + ': ' + product.name}>{copy.details}</Link>
      </div>
    </li>
  );
}
