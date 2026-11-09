'use client';

import { useEffect, useId, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CartIcon } from '@/components/cart/CartIcon';
import type { Dictionary } from '@/i18n/dictionaries';
import { localePath, type Locale } from '@/i18n/config';
import { addToCart } from '@/lib/cart/store';
import { loadCartProducts } from '@/lib/products/actions';
import type { ProductColorOption } from '@/lib/products/colors';
import type { ProductDTO } from '@/lib/products/types';

type Copy = Dictionary['store']['card'];
type Kind = 'buy' | 'cart';
// More colours than this do not fit on a card; the product page offers them instead.
const MAX_SWATCHES = 8;

// The card's round arrow widens, under the pointer or on a tap, into two icons: "Buy now" and
// "Add to cart". The piece is checked with the server first. One colour or none goes straight
// in; several colours swap the icons for their swatches, and the chosen one goes in. Sold out,
// price on request or too many colours open the product page instead.
export function ProductQuickBuy({ product, locale, copy }: { product: ProductDTO; locale: Locale; copy: Copy }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [picking, setPicking] = useState<{ kind: Kind; colors: ProductColorOption[] } | null>(null);
  // Set for a moment after the piece goes into the cart: a check pops in, then the arrow is back.
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => { setAdded(false); setOpen(false); setPicking(null); }, 1100);
    return () => clearTimeout(timer);
  }, [added]);
  const menuId = useId();
  const details = localePath(locale, '/products/' + product.id);

  async function options(): Promise<ProductColorOption[] | null> {
    const result = await loadCartProducts({ locale, ids: [product.id] });
    const found = result.ok ? result.products[0] : undefined;
    if (!found || found.priceCents === null || found.stockQuantity === 0) return null;
    const local = found.colors.filter((color) => color.locale === locale);
    return local.length ? local : found.colors.filter((color) => color.locale === 'pt');
  }

  function finish(kind: Kind, colorId: string | null) {
    if (kind === 'cart') {
      // The shared cart store: the header count follows at once; the card confirms with a check.
      if (addToCart(product.id, 1, colorId)) { setPicking(null); setAdded(true); }
      else router.push(details);
    } else {
      router.push(addToCart(product.id, 1, colorId) ? localePath(locale, '/checkout') : details);
    }
  }

  async function act(kind: Kind) {
    if (busy) return;
    setBusy(kind);
    try {
      const colors = await options().catch(() => null);
      if (!colors || colors.length > MAX_SWATCHES) { router.push(details); return; }
      if (colors.length > 1) { setPicking({ kind, colors }); return; }
      finish(kind, colors[0]?.id ?? null);
    } finally {
      setBusy(null);
    }
  }

  function close() { setOpen(false); setPicking(null); }
  const hover = (value: boolean) => (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    if (value) setOpen(true); else if (!added) close();
  };
  const leave = (event: FocusEvent<HTMLDivElement>) => {
    // A pressed button loses focus while it waits (it is disabled); that is not leaving.
    if (busy || added || !(event.relatedTarget instanceof Node)) return;
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !open) return;
    event.stopPropagation();
    if (picking) setPicking(null); else close();
  };
  const width = picking ? { '--quick-w': picking.colors.length * 34 + 10 + 'px' } as CSSProperties : undefined;

  return (
    <div className={'products-quick' + (open ? ' is-open' : '') + (picking ? ' is-picking' : '') + (added ? ' is-added' : '')} style={width}
      onPointerEnter={hover(true)} onPointerLeave={hover(false)} onBlur={leave} onKeyDown={escape}>
      <button type="button" className="products-quick-toggle" aria-expanded={open} aria-controls={menuId} aria-label={copy.buyOptions + ': ' + product.name}
        onClick={() => setOpen((value) => !value)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
      {added ? (
        <span className="products-quick-added" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          <span className="products-status">{copy.added}</span>
        </span>
      ) : picking ? (
        // Several colours: pick one, and that colour goes in. Each swatch names itself.
        <div className="products-quick-actions products-quick-swatches" id={menuId} role="group"
          aria-label={(picking.kind === 'cart' ? copy.addToCart : copy.buyNow) + ': ' + product.name}>
          {picking.colors.map((color, index) => (
            <button key={color.id} type="button" className="products-quick-swatch" autoFocus={index === 0}
              aria-label={(picking.kind === 'cart' ? copy.addToCart : copy.buyNow) + ': ' + product.name + ', ' + color.name}
              onClick={() => finish(picking.kind, color.id)}>
              <span className="products-quick-dot" style={{ backgroundColor: color.hex ?? undefined }} aria-hidden="true" />
              <span className="products-quick-tip" aria-hidden="true">{color.name}</span>
            </button>
          ))}
        </div>
      ) : (
        // Two icons in the opened pill; each names itself in a tip while pointed at or focused.
        <div className="products-quick-actions" id={menuId} role="group" aria-label={copy.buyOptions + ': ' + product.name} inert={!open}>
          <button type="button" className="products-quick-buy is-icon" aria-busy={busy === 'buy' || undefined} disabled={busy !== null}
            aria-label={copy.buyNow + ': ' + product.name} onClick={() => { void act('buy'); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg>
            <span className="products-quick-tip" aria-hidden="true">{copy.buyNow}</span>
          </button>
          <button type="button" className="products-quick-cart is-icon" aria-busy={busy === 'cart' || undefined} disabled={busy !== null}
            aria-label={copy.addToCart + ': ' + product.name} onClick={() => { void act('cart'); }}>
            <CartIcon />
            <span className="products-quick-tip" aria-hidden="true">{copy.addToCart}</span>
          </button>
        </div>
      )}
    </div>
  );
}
