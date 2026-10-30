'use client';

import { useEffect, useRef, useState } from 'react';

export function ProductPhoto({ src, name, priority, visible, active, loadingLabel, errorLabel }: {
  src: string; name: string; priority: boolean; visible: boolean; active: boolean; loadingLabel: string; errorLabel?: string;
}) {
  const image = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'failed'>('loading');
  useEffect(() => {
    const element = image.current;
    if (!element?.complete) return;
    let disposed = false;
    void element.decode().then(() => { if (!disposed) setPhase('ready'); }, () => { if (!disposed) setPhase('failed'); });
    return () => { disposed = true; };
  }, [src]);
  return <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={image} className="products-image" src={src} alt={name} width={640} height={480}
      loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" draggable={false}
      hidden={!visible || phase === 'failed'} onLoad={() => setPhase('ready')} onError={() => setPhase('failed')} />
    <div className="products-image-loader" hidden={!active || phase !== 'loading'}>
      <span className="products-media-spinner" aria-hidden="true" /><span className="products-status" role="status">{loadingLabel}</span>
    </div>
    {errorLabel && active && phase === 'failed' ? <p className="product-photo-error" role="status">{errorLabel}</p> : null}
  </>;
}
