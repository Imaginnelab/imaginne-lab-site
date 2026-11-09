'use client';

import { useId, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CartIcon } from '@/components/cart/CartIcon';
import { useCart } from '@/components/cart/CartProvider';
import type { Dictionary } from '@/i18n/dictionaries';
import { localePath, type Locale } from '@/i18n/config';
import { addToCart } from '@/lib/cart/store';
import { loadCartProducts } from '@/lib/products/actions';
import type { ProductDTO } from '@/lib/products/types';

type Copy = Dictionary['store']['card'];
type Kind = 'buy' | 'cart';

// The card's round arrow widens, under the pointer or on a tap, into two icons: "Buy now" and
// "Add to cart".
// Whether the piece can go straight to the cart is checked with the server first: one colour or
// none, and in stock. A piece that needs a choice (several colours) or is sold out opens its page
// instead, where that choice is made.
export function ProductQuickBuy({ product, locale, copy }: { product: ProductDTO; locale: Locale; copy: Copy }) {
  const { add } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Kind | null>(null);
  const menuId = useId();
  const details = localePath(locale, '/products/' + product.id);

  async function choice(): Promise<{ colorId: string | null } | null> {
    const result = await loadCartProducts({ locale, ids: [product.id] });
    const found = result.ok ? result.products[0] : undefined;
    if (!found || found.priceCents === null || found.stockQuantity === 0) return null;
    const local = found.colors.filter((color) => color.locale === locale);
    const colors = local.length ? local : found.colors.filter((color) => color.locale === 'pt');
    return colors.length > 1 ? null : { colorId: colors[0]?.id ?? null };
  }

  async function act(kind: Kind) {
    if (busy) return;
    setBusy(kind);
    try {
      const picked = await choice().catch(() => null);
      if (!picked) { router.push(details); return; }
      if (kind === 'cart') {
        if (add(product.id, 1, picked.colorId)) setOpen(false);
        else router.push(details);
      } else {
        router.push(addToCart(product.id, 1, picked.colorId) ? localePath(locale, '/checkout') : details);
      }
    } finally {
      setBusy(null);
    }
  }

  const hover = (value: boolean) => (event: PointerEvent) => { if (event.pointerType === 'mouse') setOpen(value); };
  const leave = (event: FocusEvent<HTMLDivElement>) => {
    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); } };

  return (
    <div className={'products-quick' + (open ? ' is-open' : '')} onPointerEnter={hover(true)} onPointerLeave={hover(false)} onBlur={leave} onKeyDown={escape}>
      <button type="button" className="products-quick-toggle" aria-expanded={open} aria-controls={menuId} aria-label={copy.buyOptions + ': ' + product.name}
        onClick={() => setOpen((value) => !value)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
      {/* Two icons in the opened pill; each names itself in a tip while pointed at or focused. */}
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
    </div>
  );
}
