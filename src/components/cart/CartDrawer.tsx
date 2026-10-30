'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { NavigationLink as Link } from '@/components/navigation/NavigationLink';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { loadCartProducts } from '@/lib/products/actions';
import type { ProductsResult } from '@/lib/products/types';
import { cartLineKey, type CartLine } from '@/lib/cart/state';
import { cartColor } from '@/lib/cart/color';
import { updateCartQuantity } from '@/lib/cart/store';
import { formatPrice } from '@/lib/products/format';
import { CartIcon } from './CartIcon';
import { QuantityControl } from './QuantityControl';

export default function CartDrawer({ locale, copy, lines, close }: {
  locale: Locale; copy: Dictionary['store']['cart']; lines: CartLine[]; close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const initialPath = useRef(pathname);
  useEffect(() => { if (pathname !== initialPath.current) close(); }, [pathname, close]);
  function closeIfCurrentPage(event: React.MouseEvent<HTMLAnchorElement>) {
    const url = new URL(event.currentTarget.href);
    if (url.pathname === location.pathname && url.search === location.search) close();
  }
  const [attempt, setAttempt] = useState(0);
  const ids = lines.map((line) => line.id).join(',');
  const key = locale + ':' + ids + ':' + attempt;
  const [loaded, setLoaded] = useState<{ key: string; result: ProductsResult } | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; if (origin?.isConnected) origin.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    if (!ids) return;
    let disposed = false;
    const deadline = setTimeout(() => {
      if (!disposed) { disposed = true; setLoaded({ key, result: { ok: false } }); }
    }, 12_000);
    void loadCartProducts({ locale, ids: ids.split(',') }).then(
      (result) => { clearTimeout(deadline); if (!disposed) setLoaded({ key, result }); },
      () => { clearTimeout(deadline); if (!disposed) setLoaded({ key, result: { ok: false } }); },
    );
    return () => { disposed = true; clearTimeout(deadline); };
  }, [locale, ids, key]);
  const result = loaded?.key === key ? loaded.result : null;
  const products = result?.ok ? new Map(result.products.map((product) => [product.id, product])) : null;
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + (products?.get(line.id)?.priceCents ?? 0) * line.quantity, 0);
  const incomplete = lines.some((line) => products?.get(line.id)?.priceCents == null);
  return <dialog ref={dialog} className="cart-drawer" aria-labelledby="cart-title" onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    }}>
    <div className="cart-header"><h2 id="cart-title"><CartIcon />{copy.title}<span className="cart-heading-count">{count}</span></h2>
      <button type="button" className="cart-close" onClick={close} aria-label={copy.close} autoFocus>×</button>
    </div>
    {!lines.length ? <div className="cart-empty">
      <span className="cart-empty-icon"><CartIcon /></span><h3>{copy.empty}</h3><p>{copy.emptyDescription}</p>
      <Link className="btn btn-dark" href={localePath(locale, '/products')} onClick={closeIfCurrentPage}>{copy.startShopping}</Link>
    </div> : <>
      <div className="cart-body" aria-busy={result === null}>
        {!result ? <p className="cart-feedback" role="status">{copy.loading}</p> : !result.ok ? <div className="cart-feedback" role="alert">
          <p>{copy.error}</p><button className="btn btn-ghost btn-sm" type="button" onClick={() => setAttempt((value) => value + 1)}>{copy.retry}</button>
        </div> : <ul className="cart-items">{lines.map((line) => {
          const product = products?.get(line.id);
          const color = product ? cartColor(product.colors, line.colorId, locale) : null;
          const colorMissing = !!product && (line.colorId ? !color : product.colors.length > 0);
          const itemName = product ? product.name + (color ? ' · ' + color.name : '') : '';
          return <li className="cart-item" key={cartLineKey(line)}>
            {product ? <>
              <Link className="cart-item-photo" href={localePath(locale, '/products/' + product.id)} onClick={closeIfCurrentPage} tabIndex={-1} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.photos[0]} alt="" width={88} height={88} loading="lazy" />
              </Link>
              <div className="cart-item-info">
                <Link className="cart-item-name" href={localePath(locale, '/products/' + product.id)} onClick={closeIfCurrentPage}>{product.name}</Link>
                {color ? <p className="cart-item-color"><span className="cart-color-swatch" style={color.hex ? { backgroundColor: color.hex } : undefined} aria-hidden="true" />{copy.color}: {color.name}</p> : null}
                {colorMissing ? <p className="cart-item-color-error">{line.colorId ? copy.colorUnavailable : copy.chooseColor}</p> : null}
                <p className="cart-item-price">{product.priceCents === null ? copy.onRequest : formatPrice(product.priceCents * line.quantity, locale)}</p>
                <QuantityControl value={line.quantity} copy={copy} name={itemName} onChange={(quantity) => updateCartQuantity(line.id, quantity, line.colorId)} />
              </div>
            </> : <p className="cart-unavailable">{copy.unavailable}</p>}
            <button type="button" className="cart-remove" onClick={() => updateCartQuantity(line.id, 0, line.colorId)} aria-label={copy.remove + (product ? ': ' + itemName : '')}>{copy.remove}</button>
          </li>;
        })}</ul>}
      </div>
      <div className="cart-summary">
        <p className="cart-subtotal"><span>{copy.subtotal}</span><strong>{products ? formatPrice(subtotal, locale) : '—'}</strong></p>
        {products && incomplete ? <p>{copy.partialTotal}</p> : null}
        <p>{copy.shippingNote}</p>
        <button className="btn btn-primary" type="button" disabled>{copy.checkout}</button>
        <p className="cart-coming-soon">{copy.comingSoon}</p>
        <button className="cart-continue" type="button" onClick={close}>{copy.continueShopping}</button>
      </div>
    </>}
    <p className="products-status" role="status" aria-live="polite">{copy.itemCount.replace('{count}', String(count))}</p>
  </dialog>;
}
