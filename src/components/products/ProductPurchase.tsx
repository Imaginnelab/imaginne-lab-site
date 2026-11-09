'use client';

import { useId, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import { useCart } from '@/components/cart/CartProvider';
import { CartIcon } from '@/components/cart/CartIcon';
import { QuantityControl } from '@/components/cart/QuantityControl';
import { useProductSelection } from './ProductSelection';
import { ProductColorList } from './ProductColorList';
import { MAX_CART_QUANTITY } from '@/lib/products/input';
import { NavigationLink } from '@/components/navigation/NavigationLink';
import { localePath, type Locale } from '@/i18n/config';
import { addToCart } from '@/lib/cart/store';

type Copy = Pick<Dictionary['store']['detail'], 'quantity' | 'addToCart' | 'buyNow' | 'comingSoon' | 'onRequest' | 'cartFull' | 'chooseColor' | 'quantityInvalid' | 'secure' | 'shipping' | 'maker'>
  & { colorLabel: string };

// The buying column beside the photos: the piece's name, price and stock, colour and quantity,
// the two actions, and the studio's assurances. It stays in view while the photos scroll.
export function ProductPurchase({ id, name, price, copy, quantityCopy, unavailable, stockLabel, stockTone, locale }: {
  locale: Locale;
  unavailable: boolean; stockLabel: string; stockTone: 'in' | 'out' | 'unknown';
  id: string; name: string; price: string | null; copy: Copy;
  quantityCopy: Pick<Dictionary['store']['cart'], 'quantity' | 'decrease' | 'increase'>;
}) {
  const { add } = useCart();
  const { colors, selected } = useProductSelection();
  const needsColor = colors.length > 0 && !selected;
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const quantityError = attempted && (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_CART_QUANTITY);
  const errorId = useId();
  function validSelection() {
    setAttempted(true); setError('');
    return !needsColor && Number.isInteger(quantity) && quantity > 0 && quantity <= MAX_CART_QUANTITY;
  }
  return <aside className="product-purchase" id="product-purchase">
    <h1 className="product-detail-title">{name}</h1>
    <p className="product-purchase-price">{price ?? copy.onRequest}</p>
    <p className={'product-stock is-' + stockTone}>{stockLabel}</p>
    <ProductColorList label={copy.colorLabel} error={attempted && needsColor ? copy.chooseColor : undefined} />
    <p className="product-quantity-label">{copy.quantity}</p>
    <QuantityControl value={quantity} onChange={setQuantity} copy={quantityCopy} allowInvalid invalid={quantityError} describedBy={quantityError ? errorId : undefined} />
    {quantityError ? <p className="product-field-error" id={errorId} role="alert">{copy.quantityInvalid}</p> : null}
    <button type="button" className="btn btn-primary" disabled={unavailable} onClick={() => {
      if (!validSelection()) return;
      setError(add(id, quantity, selected?.id) ? '' : copy.cartFull);
    }}><CartIcon />{copy.addToCart}</button>
    {unavailable || price === null ? <button type="button" className="btn btn-dark" disabled>{copy.buyNow}</button> :
      <NavigationLink className="btn btn-dark" href={localePath(locale, '/checkout')} onClick={(event) => {
        if (!validSelection()) { event.preventDefault(); return; }
        if (!addToCart(id, quantity, selected?.id)) { setError(copy.cartFull); event.preventDefault(); }
      }}>{copy.buyNow}</NavigationLink>}
    <p role="status" className="product-purchase-error">{error}</p>
    <ul className="product-assurances">
      <li><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>{copy.secure}</li>
      <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>{copy.shipping}</li>
      <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a5.5 5.5 0 0 0-3.2 10c.7.5 1.2 1.3 1.2 2.2v.8h4v-.8c0-.9.5-1.7 1.2-2.2A5.5 5.5 0 0 0 12 3.5ZM10 19.5h4" /></svg>{copy.maker}</li>
    </ul>
  </aside>;
}
