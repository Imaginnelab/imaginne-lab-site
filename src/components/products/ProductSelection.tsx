'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ProductColorOption } from '@/lib/products/colors';

type Selection = { colors: ProductColorOption[]; selected: ProductColorOption | null; choose: (id: string) => void };
const Context = createContext<Selection | null>(null);
export function ProductSelection({ colors, children }: { colors: ProductColorOption[]; children: ReactNode }) {
  const [colorId, setColorId] = useState<string | null>(null);
  const selected = colors.find((color) => color.id === colorId) ?? null;
  return <Context value={{ colors, selected, choose: setColorId }}>{children}</Context>;
}
export function useProductSelection() {
  const selection = useContext(Context);
  if (!selection) throw new Error('ProductSelection is required');
  return selection;
}
