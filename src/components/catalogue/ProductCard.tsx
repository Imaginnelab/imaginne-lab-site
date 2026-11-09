'use client';

import { useCallback } from 'react';
import { NavigationLink as Link } from '@/components/navigation/NavigationLink';
import type { Dictionary } from '@/i18n/dictionaries';
import { localePath, type Locale } from '@/i18n/config';
import type { ProductDTO } from '@/lib/products/types';
import { ProductMedia } from './ProductMedia';
import { ProductQuickBuy } from './ProductQuickBuy';
import { trackView } from './track-view';

type Copy = Dictionary['store']['card'];
export function ProductCard({ product, locale, copy, priority = false }: {
  product: ProductDTO; locale: Locale; copy: Copy; priority?: boolean;
}) {
  const interest = useCallback(() => trackView(product.id), [product.id]);
  const href = localePath(locale, '/products/' + product.id);
  return (
    <li className={'products-card' + (product.featured ? ' products-featured' : '')} onClick={interest}>
      <ProductMedia product={product} locale={locale} copy={copy} priority={priority} />
      {product.featured ? <span className="products-featured-badge">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9Z" /></svg>
        {copy.mostViewed}
      </span> : null}
      <div className="products-content">
        <h3 className="products-name"><Link href={href} prefetch={false}>{product.name}</Link></h3>
        <p className="products-description">{product.description}</p>
        <div className="products-buy">
          <p className="products-price">{product.price ?? copy.request}</p>
          {product.price === null ? (
            <Link className="products-order" href={href} prefetch={false} aria-label={copy.details + ': ' + product.name}>
              <span className="products-order-label">{copy.details}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          ) : <ProductQuickBuy product={product} locale={locale} copy={copy} />}
        </div>
      </div>
    </li>
  );
}
