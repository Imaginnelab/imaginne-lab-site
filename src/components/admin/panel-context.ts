'use client';
import { createContext, useCallback, useContext } from 'react';
export type PanelName = 'products' | 'coupons';
export const PanelContext = createContext<{ active: PanelName; publish: (name: PanelName, count: number) => void }>({
  active: 'products', publish: () => {},
});
export function usePanel(name: PanelName) {
  const context = useContext(PanelContext);
  const publish = context.publish;
  const onCount = useCallback((count: number) => publish(name, count), [name, publish]);
  return { active: context.active === name, onCount };
}

