'use client';

import { useCallback, useRef, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import type { ProductDTO } from '@/lib/products/types';
import { ProductPhoto } from '@/components/catalogue/ProductPhoto';
import { ModelMedia } from '@/components/catalogue/ModelMedia';

type Copy = Dictionary['store']['card'];
const noInterest = () => {};

// Every photo of the piece at once, in a two-column grid with the first one large; on phones the
// grid becomes a row to swipe. A 3D model is one more tile, loaded only when asked for.
export function ProductPhotoGrid({ product, locale, copy, imageError }: { product: ProductDTO; locale: Locale; copy: Copy; imageError: string }) {
  return <div className="product-gallery product-photo-grid" role="group" aria-label={copy.photos + ': ' + product.name} tabIndex={0}>
    {product.photos.map((src, position) => <figure key={src} className="product-tile products-photo product-detail-photo">
      <ProductPhoto src={src} name={product.name + (product.photos.length > 1 ? ` (${copy.photo} ${position + 1})` : '')}
        priority={position === 0} loadingLabel={copy.loadingImage} errorLabel={imageError} visible active />
    </figure>)}
    {product.modelUrl ? <ProductModelTile product={product} locale={locale} copy={copy} /> : null}
  </div>;
}

function ProductModelTile({ product, locale, copy }: { product: ProductDTO; locale: Locale; copy: Copy }) {
  const tile = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(true);
  const unsupported = useCallback(() => setSupported(false), []);
  if (!supported || !product.modelUrl) return null;
  return <div ref={tile} className="product-tile product-tile-model products-photo product-detail-photo products-model-active">
    {!ready ? <ProductPhoto src={product.photos[0]} name={product.name} priority={false} loadingLabel={copy.loadingImage} visible active={!open} /> : null}
    <span className="products-model-badge" aria-hidden="true">{copy.modelBadge}</span>
    {open ? <ModelMedia photo={tile} selected url={product.modelUrl} bytes={product.modelBytes} poster={product.photos[0]} name={product.name}
      locale={locale} copy={copy} interest={noInterest} onReady={setReady} onUnsupported={unsupported} /> :
      <div className="products-model-prompt"><button type="button" className="products-model-open" aria-label={copy.openModel} onClick={() => setOpen(true)}>{copy.openModel}</button></div>}
  </div>;
}
