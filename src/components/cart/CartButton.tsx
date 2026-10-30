'use client';

import { useCart } from './CartProvider';
import { CartIcon } from './CartIcon';

export function CartButton({ label }: { label: string }) {
  const { lines, open } = useCart();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return <button type="button" className="cart-trigger" onClick={open} aria-label={label + (count ? ` (${count})` : '')} aria-haspopup="dialog">
    <CartIcon /><span className="cart-count" hidden={!count}>{count}</span>
  </button>;
}
