'use client';

import { startTransition, useCallback, useRef, useState } from 'react';
import { loadProductPage } from '@/lib/products/actions';
import { freshRows } from '@/lib/products/format';
import { searchTerm } from '@/lib/search';
import type { Locale } from '@/i18n/config';
import type { PageInput, PageResult, ProductPage, ProductDTO } from '@/lib/products/types';

type State = { page: ProductPage; loading: boolean; error: boolean };
const emptyPage = (term = ''): ProductPage => ({ items: [], offset: 0, hasMore: true, featuredId: null, term });
function invoke(input: PageInput): Promise<PageResult> {
  return new Promise((resolve) => {
    startTransition(async () => {
      try { resolve(await loadProductPage(input)); } catch { resolve({ ok: false }); }
    });
  });
}

export function usePagedProducts(locale: Locale, initial: PageResult, initialTerm = '') {
  const [state, setState] = useState<State>(() => ({
    page: initial.ok ? initial.page : emptyPage(initialTerm), loading: false, error: !initial.ok,
  }));
  const latest = useRef(state);
  const generation = useRef(0);
  const flight = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(true);
  const update = useCallback((next: State) => { latest.current = next; if (mounted.current) setState(next); }, []);
  const request = useCallback((replace: boolean, explicit = false): Promise<boolean> => {
    if (flight.current) return flight.current;
    const snapshot = latest.current;
    if (!replace && (!snapshot.page.hasMore || (snapshot.error && !explicit))) return Promise.resolve(false);
    const current = generation.current;
    update({ ...snapshot, loading: true, error: false });
    const run = async () => {
      const result = await invoke({
        locale, term: snapshot.page.term, offset: replace ? 0 : snapshot.page.offset,
        featuredId: replace ? null : snapshot.page.featuredId,
      });
      if (current !== generation.current || !mounted.current) return false;
      if (!result.ok) { update({ ...latest.current, loading: false, error: true }); return false; }
      const incoming = replace ? result.page.items : freshRows<ProductDTO>(latest.current.page.items, result.page.items);
      const page = { ...result.page, items: replace ? incoming : [...latest.current.page.items, ...incoming] };
      update({ page, loading: false, error: false });
      return incoming.length > 0;
    };
    const pending = run().finally(() => { if (current === generation.current) flight.current = null; });
    flight.current = pending;
    return pending;
  }, [locale, update]);
  const loadNext = useCallback((explicit = false) => request(false, explicit), [request]);
  const search = useCallback((value: string) => {
    generation.current++;
    flight.current = null;
    update({ page: emptyPage(searchTerm(value)), loading: false, error: false });
    return request(true, true);
  }, [request, update]);
  const retry = useCallback(() => request(latest.current.page.items.length === 0, true), [request]);
  // Owned by the consuming component's mount/unmount effect, including Strict Mode remounts.
  const activate = useCallback(() => { mounted.current = true; }, []);
  const dispose = useCallback(() => { mounted.current = false; generation.current++; flight.current = null; }, []);
  return { ...state, loadNext, search, retry, activate, dispose };
}
