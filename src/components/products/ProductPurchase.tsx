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

export function ProductPurchase({ id, price, copy, quantityCopy, unavailable, stockLabel, locale }: {
  locale: Locale;
  unavailable: boolean; stockLabel: string;
  id: string; price: string | null; copy: Pick<Dictionary['store']['detail'], 'quantity' | 'addToCart' | 'buyNow' | 'comingSoon' | 'onRequest' | 'cartFull' | 'chooseColor' | 'quantityInvalid'> & { colorLabel: string };
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
  return <aside className="product-purchase">
    <p className="product-purchase-price">{price ?? copy.onRequest}</p>
    <p className="product-quantity-label">{copy.quantity}</p>
    <QuantityControl value={quantity} onChange={setQuantity} copy={quantityCopy} allowInvalid invalid={quantityError} describedBy={quantityError ? errorId : undefined} />
    <p className="product-stock">{stockLabel}</p>
    {quantityError ? <p className="product-field-error" id={errorId} role="alert">{copy.quantityInvalid}</p> : null}
    <ProductColorList label={copy.colorLabel} error={attempted && needsColor ? copy.chooseColor : undefined} />
    <button type="button" className="btn btn-primary" disabled={unavailable} onClick={() => {
      if (!validSelection()) return;
      setError(add(id, quantity, selected?.id) ? '' : copy.cartFull);
    }}><CartIcon />{copy.addToCart}</button>
    {unavailable || price === null ? <button type="button" className="btn btn-ghost" disabled>{copy.buyNow}</button> :
      <NavigationLink className="btn btn-ghost" href={localePath(locale, '/checkout')} onClick={(event) => {
        if (!validSelection()) { event.preventDefault(); return; }
        if (!addToCart(id, quantity, selected?.id)) { setError(copy.cartFull); event.preventDefault(); }
      }}>{copy.buyNow}</NavigationLink>}
    <p role="status" className="product-purchase-error">{error}</p>
  </aside>;
}
