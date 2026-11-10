'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ProductColorOption } from '@/lib/products/colors';

// `attempted` turns on once a purchase was tried, so the colour list can say a colour is missing.
type Selection = { colors: ProductColorOption[]; selected: ProductColorOption | null; choose: (id: string) => void; attempted: boolean; attempt: () => void };
const Context = createContext<Selection | null>(null);
export function ProductSelection({ colors, children }: { colors: ProductColorOption[]; children: ReactNode }) {
  const [colorId, setColorId] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const selected = colors.find((color) => color.id === colorId) ?? null;
  return <Context value={{ colors, selected, choose: setColorId, attempted, attempt: () => setAttempted(true) }}>{children}</Context>;
}
export function useProductSelection() {
  const selection = useContext(Context);
  if (!selection) throw new Error('ProductSelection is required');
  return selection;
}
