'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import type { PageResult } from '@/lib/products/types';
import { ProductCard } from './ProductCard';
import { SearchBox } from './SearchBox';
import { usePagedProducts } from './usePagedProducts';
import { retryWithFocus } from './retry-focus';
import '@/styles/products.css';
import '@/styles/catalogue.css';
import '@/styles/product-search.css';

type Copy = Pick<Dictionary['store'], 'card' | 'search' | 'list'> & { page: Pick<Dictionary['store']['page'], 'lede' | 'region'> };
export function CatalogueGrid({ locale, initial, initialTerm, copy, heading }: { locale: Locale; initial: PageResult; initialTerm: string; copy: Copy; heading: React.ReactNode }) {
  const list = usePagedProducts(locale, initial, initialTerm);
  const sentinel = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  const { loadNext, activate, dispose, search, retry } = list;
  useEffect(() => { activate(); return dispose; }, [activate, dispose]);
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !list.page.hasMore || list.loading || list.error) return;
    const observe = () => { void loadNext(); };
    if (window.IntersectionObserver) {
      const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) observe(); }, { rootMargin: '160px 0px' });
      observer.observe(element);
      return () => observer.disconnect();
    }
    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (element.getBoundingClientRect().top < innerHeight + 160) observe();
      });
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [list.page.hasMore, list.page.offset, list.loading, list.error, loadNext]);
  const onSearch = useCallback((term: string) => {
    const url = new URL(location.href);
    if (term) url.searchParams.set('q', term); else url.searchParams.delete('q');
    try { history.replaceState(history.state, '', url); } catch { /* Search still works without history. */ }
    return search(term);
  }, [search]);
  const empty = list.page.items.length === 0;
  const message = list.error ? copy.list.error : empty && !list.loading ?
    (list.page.term ? copy.search.noResults.replace('{term}', list.page.term) : copy.list.empty) : '';
  return (
    <>
      <div className="section-head catalogue-heading">
        {heading}
        <div className="catalogue-search-row">
          <p className="lede">{copy.page.lede}</p>
          <div data-catalogue-search=""><SearchBox copy={copy.search} onSearch={onSearch} initialTerm={initialTerm} /></div>
        </div>
      </div>
      <ul ref={grid} tabIndex={-1} className="catalogue-grid" data-catalogue-grid="" role="list" aria-label={copy.page.region} aria-busy={list.loading ? 'true' : undefined}>
        {list.page.items.map((product, index) => <ProductCard key={product.id} product={product} locale={locale} copy={copy.card} priority={index === 0} />)}
      </ul>
      <div className="catalogue-feedback">
        <p data-catalogue-message="" role="status" aria-live="polite">{message}</p>
        <p className="catalogue-loading" data-catalogue-loading="" role="status" hidden={!list.loading}>{copy.list.loading}</p>
        <button className="btn btn-ghost catalogue-retry" type="button" data-catalogue-retry="" hidden={!list.error}
          disabled={list.loading} aria-busy={list.loading ? 'true' : undefined}
          onClick={(event) => { void retryWithFocus(retry, event.currentTarget, () => grid.current); }}>{copy.list.retry}</button>
      </div>
      <div ref={sentinel} className="catalogue-sentinel" data-catalogue-sentinel="" aria-hidden="true" hidden={!list.page.hasMore} />
      <p className="products-status" data-catalogue-status="" role="status" aria-live="polite" aria-atomic="true">{copy.list.count}: {list.page.items.length}</p>
    </>
  );
}
