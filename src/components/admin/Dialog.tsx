'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export function Dialog({ id, title, description, children, close, busy = false, size = '' }: {
  id: string; title: string; description?: string; children: ReactNode; close: () => void; busy?: boolean; size?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => { element.close(); if (origin?.isConnected) origin.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} id={id} className={'admin-dialog ' + size} aria-labelledby={id + '-title'}
    aria-describedby={description ? id + '-text' : undefined}
    onCancel={(event) => { event.preventDefault(); if (!busy) close(); }}>
    {description ? <><h2 id={id + '-title'}>{title}</h2><p id={id + '-text'}>{description}</p></> : null}
    {children}
  </dialog>;
}

