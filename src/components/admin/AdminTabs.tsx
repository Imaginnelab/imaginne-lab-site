'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { fill } from '@/lib/admin/client/text';
import type { AdminDictionary } from '@/i18n/admin-dictionaries';
import { PanelContext, type PanelName } from './panel-context';
type Copy = Pick<AdminDictionary['interface'], 'tabs' | 'tabProducts' | 'tabCoupons' | 'tabCount'>;
const names: PanelName[] = ['products', 'coupons'];
export function AdminTabs({ copy, locale, initialCounts, products, coupons }: {
  copy: Copy; locale: string; initialCounts: { products: number | null; coupons: number | null }; products: ReactNode; coupons: ReactNode;
}) {
  const [selected, setSelected] = useState<PanelName>('products');
  const [counts, setCounts] = useState(initialCounts);
  const bar = useRef<HTMLDivElement>(null);
  const buttons = useRef<Partial<Record<PanelName, HTMLButtonElement | null>>>({});
  const panels = useRef<Partial<Record<PanelName, HTMLElement | null>>>({});
  const current = useRef<PanelName>('products');
  const transition = useRef<{ skipTransition(): void; ready: Promise<void>; finished: Promise<void> } | null>(null);
  const publish = useCallback((name: PanelName, count: number) => setCounts((before) => ({ ...before, [name]: count })), []);
  const productCount = initialCounts.products, couponCount = initialCounts.coupons;
  useEffect(() => { setCounts({ products: productCount, coupons: couponCount }); }, [productCount, couponCount]);
  function select(name: PanelName, focus = false, remember = true) {
    const previous = current.current;
    if (previous === name) { if (focus) buttons.current[name]?.focus(); return; }
    const back = name === 'products';
    const show = () => { current.current = name; flushSync(() => setSelected(name)); };
    transition.current?.skipTransition();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && document.startViewTransition) {
      document.documentElement.dataset.tabs = back ? 'back' : 'forward';
      const pending = document.startViewTransition(show);
      transition.current = pending;
      void pending.ready.catch(() => {});
      void pending.finished.catch(() => {}).finally(() => { if (transition.current === pending) { transition.current = null; delete document.documentElement.dataset.tabs; } });
    } else {
      show();
      const panel = panels.current[name];
      if (panel && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        panel.classList.remove('admin-panel-in', 'admin-panel-in-back'); void panel.offsetWidth;
        panel.classList.add(back ? 'admin-panel-in-back' : 'admin-panel-in');
      }
    }
    if (focus) buttons.current[name]?.focus();
    if (remember) try { history.replaceState(history.state, '', location.pathname + location.search + '#' + name); } catch { /* Tab remains usable. */ }
  }
  const selectRef = useRef(select);
  useEffect(() => { selectRef.current = select; });
  useEffect(() => {
    const element = bar.current;
    const place = () => {
      const button = buttons.current[current.current];
      if (element && button) { element.style.setProperty('--tab-x', button.offsetLeft + 'px'); element.style.setProperty('--tab-w', button.offsetWidth + 'px'); }
    };
    const initial = location.hash === '#coupons' ? 'coupons' : 'products';
    current.current = initial; setSelected(initial);
    let frame = requestAnimationFrame(() => { place(); element?.classList.add('is-ready'); });
    const changed = () => { const name = location.hash.slice(1); if (name === 'products' || name === 'coupons') selectRef.current(name, false, false); };
    const observer = window.ResizeObserver ? new ResizeObserver(place) : null;
    if (element) observer?.observe(element);
    names.forEach((name) => { const button = buttons.current[name]; if (button) observer?.observe(button); });
    window.addEventListener('resize', place, { passive: true }); window.addEventListener('hashchange', changed);
    return () => { cancelAnimationFrame(frame); frame = 0; observer?.disconnect(); window.removeEventListener('resize', place); window.removeEventListener('hashchange', changed); transition.current?.skipTransition(); transition.current = null; delete document.documentElement.dataset.tabs; };
  }, []);
  useEffect(() => {
    const button = buttons.current[selected], element = bar.current;
    if (button && element) { element.style.setProperty('--tab-x', button.offsetLeft + 'px'); element.style.setProperty('--tab-w', button.offsetWidth + 'px'); }
  }, [selected, counts]);
  return <PanelContext.Provider value={{ active: selected, publish }}>
    <div className="admin-tabs" id="admin-tabs" role="tablist" aria-label={copy.tabs} ref={bar}
      onKeyDown={(event) => {
        const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[role="tab"]') : null;
        const index = names.indexOf(button?.dataset.tab as PanelName);
        if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
        const destination: Record<string, number> = { ArrowRight: (index + 1) % 2, ArrowLeft: (index + 1) % 2, Home: 0, End: 1 };
        if (!(event.key in destination)) return;
        event.preventDefault(); select(names[destination[event.key]], true);
      }}>
      {names.map((name) => {
        const label = name === 'products' ? copy.tabProducts : copy.tabCoupons;
        const count = counts[name], number = count === null ? '' : new Intl.NumberFormat(locale).format(count);
        return <button key={name} ref={(element) => { buttons.current[name] = element; }} className="admin-tab" id={'tab-' + name} type="button" role="tab"
          data-tab={name} aria-controls={name} aria-selected={selected === name} tabIndex={selected === name ? 0 : -1}
          aria-label={count === null ? undefined : fill(copy.tabCount, { label, n: number })} onClick={() => select(name)}>
          <span className="admin-tab-label" data-label={label}><span>{label}</span></span><span className="admin-tab-count" hidden={count === null}>{number}</span>
        </button>;
      })}
    </div>
    <section className="products" id="products" role="tabpanel" aria-labelledby="tab-products" hidden={selected !== 'products'} ref={(element) => { panels.current.products = element; }}>{products}</section>
    <section className="products coupons" id="coupons" role="tabpanel" aria-labelledby="tab-coupons" hidden={selected !== 'coupons'} ref={(element) => { panels.current.coupons = element; }}>{coupons}</section>
  </PanelContext.Provider>;
}
