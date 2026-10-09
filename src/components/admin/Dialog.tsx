'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export function Dialog({ id, title, description, children, close, busy = false, size = '', initialFocus }: {
  id: string; title: string; description?: string; children: ReactNode; close: () => void; busy?: boolean; size?: string; initialFocus?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallback = origin?.closest('[role="tabpanel"]')?.querySelector<HTMLElement>('#product-new, #coupon-new') ?? null;
    element.showModal();
    if (initialFocus) element.querySelector<HTMLElement>(initialFocus)?.focus({ preventScroll: true });
    return () => { element.close(); const target = origin?.isConnected ? origin : fallback; if (target?.isConnected) target.focus({ preventScroll: true }); };
  }, [initialFocus]);
  return <dialog ref={ref} id={id} className={'admin-dialog ' + size} aria-labelledby={id + '-title'}
    aria-describedby={description ? id + '-text' : undefined}
    onCancel={(event) => { event.preventDefault(); if (!busy) close(); }}>
    {description ? <><h2 id={id + '-title'}>{title}</h2><p id={id + '-text'}>{description}</p></> : null}
    {children}
  </dialog>;
}
