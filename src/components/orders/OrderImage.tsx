'use client';
import { useState } from 'react';

export function OrderImage({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  return <span className="order-image" aria-hidden="true">
    {src && !failed ?
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={88} height={88} loading="lazy" onError={() => setFailed(true)} /> :
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 9 12-6 12 6v15l-12 6-12-6Zm0 0 12 6 12-6M16 15v15M10 6l12 6v6" /></svg>}
  </span>;
}
