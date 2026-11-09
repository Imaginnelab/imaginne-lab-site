'use client';
import { NavigationLink } from '@/components/navigation/NavigationLink';

import { useCallback, useEffect, useId, useRef } from 'react';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import type { PageResult } from '@/lib/products/types';
import { ProductCard } from './ProductCard';
import { SearchBox } from './SearchBox';
import { usePagedProducts } from './usePagedProducts';
import { enableCarousel } from './carousel-controller';
import { retryWithFocus } from './retry-focus';
import '@/styles/products.css';
import '@/styles/product-search.css';

type Copy = Pick<Dictionary['store'], 'card' | 'search' | 'list' | 'carousel'>;
export function Carousel({ locale, initial, copy }: { locale: Locale; initial: PageResult; copy: Copy }) {
  const list = usePagedProducts(locale, initial);
  const track = useRef<HTMLUListElement>(null);
  const previous = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const controls = useRef<ReturnType<typeof enableCarousel> | null>(null);
  const snapshot = useRef({ page: list.page, loading: list.loading, error: list.error });
  const trackId = useId();
  const { loadNext, search, retry, activate, dispose } = list;
  useEffect(() => {
    snapshot.current = { page: list.page, loading: list.loading, error: list.error };
    controls.current?.refresh();
  }, [list.page, list.loading, list.error]);
  useEffect(() => {
    activate();
    if (!track.current || !previous.current || !next.current || !status.current) return dispose;
    let retryOnReturn = false;
    const api = enableCarousel(track.current, previous.current, next.current, status.current, { position: copy.list.position }, {
      hasMore: () => snapshot.current.page.hasMore,
      count: () => snapshot.current.page.items.length,
      busy: () => snapshot.current.loading,
      loadMore: loadNext,
      near(near) {
        if (!near) { retryOnReturn = true; return; }
        if (snapshot.current.loading || !snapshot.current.page.hasMore || !snapshot.current.page.items.length) return;
        const explicit = snapshot.current.error && retryOnReturn;
        if (snapshot.current.error && !explicit) return;
        retryOnReturn = false;
        void loadNext(explicit);
      },
    });
    controls.current = api;
    return () => { api.dispose(); controls.current = null; dispose(); };
  }, [activate, dispose, loadNext, copy.list.position]);
  // The rail under the track: how much of the row is in view, and where. The card width is
  // shared with the stage so its arrows line up with the middle of the photos.
  const rail = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = track.current;
    const bar = rail.current;
    if (!element || !bar) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const size = element.scrollWidth > 0 ? Math.min(1, element.clientWidth / element.scrollWidth) : 1;
      const room = element.scrollWidth - element.clientWidth;
      bar.style.setProperty('--rail-size', String(size));
      bar.style.setProperty('--rail-at', String(room > 0 ? element.scrollLeft / room : 0));
      bar.hidden = size >= 1;
      const card = element.firstElementChild;
      if (card) stage.current?.style.setProperty('--card-w', card.getBoundingClientRect().width + 'px');
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    paint();
    element.addEventListener('scroll', schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    return () => { cancelAnimationFrame(frame); element.removeEventListener('scroll', schedule); observer.disconnect(); };
  }, [list.page.items.length]);
  const onSearch = useCallback((term: string) => {
    const pending = search(term);
    controls.current?.reset();
    return pending;
  }, [search]);
  const empty = list.page.items.length === 0;
  const onRetry = (button: HTMLButtonElement) => retryWithFocus(retry, button, () => {
    if (track.current && !track.current.hidden) return track.current;
    return track.current?.parentElement?.querySelector<HTMLInputElement>('input[type="search"]') ?? null;
  });
  const message = list.error ? copy.list.error : list.loading ? copy.list.loading :
    list.page.term ? copy.search.noResults.replace('{term}', list.page.term) : copy.list.empty;
  return (
    <div className="products-carousel" role="region" aria-label={copy.carousel.region}>
      <div className="products-controls">
        <NavigationLink className="btn btn-ghost btn-sm products-all-link" href={localePath(locale, '/products')}>{copy.carousel.all}</NavigationLink>
        <div data-products-search=""><SearchBox copy={copy.search} onSearch={onSearch} /></div>
      </div>
      {empty ? <div className="products-empty products-search-feedback">
        <p role="status">{message}</p>
        <button className="products-page-retry" type="button" hidden={!list.error} disabled={list.loading}
          aria-busy={list.loading ? 'true' : undefined} onClick={(event) => { void onRetry(event.currentTarget); }}>{copy.list.retry}</button>
      </div> : null}
      {/* The page arrows sit on the sides of the row, level with the middle of the photos. */}
      <div className="products-stage" ref={stage}>
        <button ref={previous} type="button" className="products-arrow is-icon" data-products-previous="" aria-label={copy.carousel.previous} aria-controls={trackId} disabled><span aria-hidden="true" /></button>
        <ul className="products-track" id={trackId} ref={track} data-products-track="" role="list" aria-label={copy.carousel.region}
          hidden={empty} style={empty ? { display: 'none' } : undefined} tabIndex={empty ? -1 : 0} aria-busy={list.loading ? 'true' : undefined}>
          {list.page.items.map((product, index) => <ProductCard key={product.id} product={product} locale={locale} copy={copy.card} priority={index === 0} />)}
          {!empty && (list.loading || list.error) ? <li className="products-card products-page-loader">
            <span className="products-media-spinner" aria-hidden="true" hidden={!list.loading} />
            <p role="status">{list.error ? copy.list.retryMore : copy.list.loadingMore}</p>
            <button className="products-page-retry" type="button" hidden={!list.error} disabled={list.loading}
              aria-busy={list.loading ? 'true' : undefined} onClick={(event) => { void onRetry(event.currentTarget); }}>{copy.list.retry}</button>
          </li> : null}
        </ul>
        <button ref={next} type="button" className="products-arrow is-icon" data-products-next="" aria-label={copy.carousel.next} aria-controls={trackId} disabled={empty}><span aria-hidden="true" /></button>
      </div>
      <div className="products-rail" ref={rail} aria-hidden="true" hidden><span /></div>
      <p className="products-status" ref={status} data-products-status="" role="status" aria-live="polite" aria-atomic="true">{copy.list.position}: {list.page.items.length}</p>
    </div>
  );
}
