'use client';

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { addToCart, cartSnapshot, serverCartSnapshot, subscribeCart } from '@/lib/cart/store';
import type { CartLine } from '@/lib/cart/state';

const CartDrawer = dynamic(() => import('./CartDrawer'), { ssr: false });
type CartContextValue = { lines: CartLine[]; open: () => void; add: (id: string, quantity: number, colorId?: string | null) => boolean };
const CartContext = createContext<CartContextValue | null>(null);
export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('CartProvider is required');
  return cart;
}
export function CartProvider({ children, locale, copy }: { children: ReactNode; locale: Locale; copy: Dictionary['store']['cart'] }) {
  const lines = useSyncExternalStore(subscribeCart, cartSnapshot, serverCartSnapshot);
  const [opened, setOpened] = useState(false);
  const open = () => setOpened(true);
  const add = (id: string, quantity: number, colorId: string | null = null) => {
    const added = addToCart(id, quantity, colorId);
    if (added) open();
    return added;
  };
  return <CartContext value={{ lines, open, add }}>
    {children}
    {opened ? <CartDrawer locale={locale} copy={copy} lines={lines} close={() => setOpened(false)} /> : null}
  </CartContext>;
}
