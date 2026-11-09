'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { NavigationLink } from '@/components/navigation/NavigationLink';
import { QuantityControl } from '@/components/cart/QuantityControl';
import { useCart } from '@/components/cart/CartProvider';
import { cartLineKey } from '@/lib/cart/state';
import { updateCartQuantity } from '@/lib/cart/store';
import { loadCartProducts } from '@/lib/products/actions';
import type { ProductsResult } from '@/lib/products/types';
import { formatPrice } from '@/lib/products/format';
import { cartColor } from '@/lib/cart/color';
import { prepareCheckoutCart } from '@/lib/checkout/cart';
import { createCheckout } from '@/lib/checkout/actions';
import type { CheckoutError } from '@/lib/checkout/schema';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

type Props = {
  locale: Locale; copy: Dictionary['store']['checkout']; cartCopy: Dictionary['store']['cart'];
  signedIn: boolean; configured: boolean; shippingCents: number; taxEnabled: boolean; canceled: boolean;
};

export function CheckoutReview({ locale, copy, cartCopy, signedIn, configured, shippingCents, taxEnabled, canceled }: Props) {
  const { lines } = useCart();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; result: ProductsResult } | null>(null);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const request = useRef<{ snapshot: string; id: string } | null>(null);
  const ids = [...new Set(lines.map((line) => line.id))].join(',');
  const key = locale + ':' + ids + ':' + attempt;
  useEffect(() => {
    if (!ids) return;
    let disposed = false;
    const timeout = setTimeout(() => {
      if (!disposed) { disposed = true; setLoaded({ key, result: { ok: false } }); }
    }, 12_000);
    void loadCartProducts({ locale, ids: ids.split(',') }).then(
      (result) => { clearTimeout(timeout); if (!disposed) setLoaded({ key, result }); },
      () => { clearTimeout(timeout); if (!disposed) setLoaded({ key, result: { ok: false } }); },
    );
    return () => { disposed = true; clearTimeout(timeout); };
  }, [locale, ids, key]);

  const result = loaded?.key === key ? loaded.result : null;
  const products = result?.ok ? result.products : [];
  const cart = prepareCheckoutCart(lines, products, locale);
  const byId = new Map(products.map((product) => [product.id, product]));

  function submit() {
    if (!cart.ok || !signedIn || !configured || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    const snapshot = JSON.stringify({ locale, lines, subtotalCents: cart.subtotalCents });
    if (request.current?.snapshot !== snapshot) request.current = { snapshot, id: crypto.randomUUID() };
    const requestId = request.current.id;
    startTransition(async () => {
      try {
        const response = await createCheckout({ locale, lines, subtotalCents: cart.subtotalCents, requestId });
        if (response.ok) { window.location.assign(response.url); return; }
        setError(response.error);
        if (response.error === 'signIn') router.refresh();
        if (['priceChanged', 'stock', 'colorUnavailable', 'productUnavailable'].includes(response.error)) setAttempt((value) => value + 1);
      } catch { setError('unavailable'); }
      finally { inFlight.current = false; }
    });
  }

  if (!lines.length) return <div className="checkout-empty"><h2>{cartCopy.empty}</h2><p>{cartCopy.emptyDescription}</p>
    <NavigationLink className="btn btn-primary" href={localePath(locale, '/products')}>{cartCopy.startShopping}</NavigationLink></div>;

  return <div className="checkout-grid" aria-busy={pending}>
    <section className="checkout-items" aria-labelledby="checkout-items-title">
      <h2 id="checkout-items-title">{copy.items}</h2>
      {!result ? <p role="status">{cartCopy.loading}</p> : !result.ok ? <div role="alert"><p>{cartCopy.error}</p>
        <button className="btn btn-ghost" type="button" onClick={() => setAttempt((value) => value + 1)}>{cartCopy.retry}</button></div> :
        <ul>{lines.map((line) => {
          const product = byId.get(line.id);
          const color = product ? cartColor(product.colors, line.colorId, locale) : null;
          return <li key={cartLineKey(line)} className="checkout-item">
            {product ? <>
              <NavigationLink className="checkout-photo" href={localePath(locale, '/products/' + line.id)} tabIndex={-1} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.photos[0]} alt="" width={88} height={88} />
              </NavigationLink>
              <div className="checkout-item-info"><NavigationLink href={localePath(locale, '/products/' + line.id)}>{product.name}</NavigationLink>
                {color ? <p>{cartCopy.color}: {color.name}</p> : (product.colors.length || line.colorId) ? <p>{cartCopy.chooseColor}</p> : null}
                <p>{product.priceCents === null ? cartCopy.onRequest : formatPrice(product.priceCents * line.quantity, locale)}</p>
                <QuantityControl value={line.quantity} copy={cartCopy} name={product.name} onChange={(quantity) => { setError(null); updateCartQuantity(line.id, quantity, line.colorId); }} disabled={pending} />
              </div>
            </> : <p>{cartCopy.unavailable}</p>}
            <button className="cart-remove" type="button" disabled={pending} onClick={() => { setError(null); updateCartQuantity(line.id, 0, line.colorId); }}
              aria-label={cartCopy.remove + (product ? ': ' + product.name : '')}>{cartCopy.remove}</button>
          </li>;
        })}</ul>}
    </section>
    <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
      <h2 id="checkout-summary-title">{copy.summary}</h2>
      <dl><div><dt>{cartCopy.subtotal}</dt><dd>{result?.ok && cart.ok ? formatPrice(cart.subtotalCents, locale) : '—'}</dd></div>
        <div><dt>{copy.shipping}</dt><dd>{formatPrice(shippingCents, locale)}</dd></div>
        <div><dt>{copy.tax}</dt><dd>{taxEnabled ? copy.taxAtPayment : copy.taxNotConfigured}</dd></div>
        <div className="checkout-total"><dt>{copy.totalBeforeTax}</dt><dd>{result?.ok && cart.ok ? formatPrice(cart.subtotalCents + shippingCents, locale) : '—'}</dd></div></dl>
      <p>{copy.deliveryNote}</p>
      {canceled ? <p role="status">{copy.canceled}</p> : null}
      {!configured ? <p role="status">{copy.errors.configuration}</p> : null}
      {!signedIn ? <p>{copy.signInNote}</p> : null}
      {result?.ok && !cart.ok ? <p role="alert">{copy.errors[cart.error]}</p> : null}
      {error ? <p role="alert">{copy.errors[error]}</p> : null}
      <button className="btn btn-primary" type="button" disabled={pending || !signedIn || !configured || !result?.ok || !cart.ok} onClick={submit}>
        {pending ? copy.redirecting : copy.pay}
      </button>
      <p className="checkout-secure">{copy.secure}</p>
    </aside>
  </div>;
}
