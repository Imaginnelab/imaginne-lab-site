'use client';

import { useEffect, useRef } from 'react';

// Where an <img> laid out with object-fit: contain actually paints its picture.
export function paintedRect(image: HTMLImageElement) {
  const box = image.getBoundingClientRect();
  const ratio = image.naturalWidth / image.naturalHeight;
  if (!ratio) return box;
  const width = Math.min(box.width, box.height * ratio), height = width / ratio;
  return new DOMRect(box.left + (box.width - width) / 2, box.top + (box.height - height) / 2, width, height);
}

const shade = ['rgba(20, 24, 17, 0)', 'rgba(20, 24, 17, .82)'];

// Moves the picture between where it sits on the page and the middle of the screen.
function travel(picture: HTMLImageElement, from: DOMRect | null, direction: 'in' | 'out') {
  if (!from || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const to = picture.getBoundingClientRect();
  if (!to.width || !to.height) return null;
  const away = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
  const frames = direction === 'in' ? [away, 'none'] : ['none', away];
  return picture.animate({ transform: frames }, { duration: direction === 'in' ? 420 : 320, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'forwards' });
}

// The opened photo: it grows from its place on the page to the middle of the screen, and
// shrinks back there when a click lands outside it or Escape is pressed.
export function ProductZoom({ src, alt, size, from, origin, onClosed }: {
  src: string; alt: string; size: { width: number; height: number };
  from: DOMRect; origin: () => DOMRect | null; onClosed: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const closing = useRef(false);
  useEffect(() => {
    const element = dialog.current, picture = image.current;
    if (!element || !picture) return;
    if (!element.open) element.showModal();
    travel(picture, from, 'in');
    element.animate({ backgroundColor: shade }, { duration: 420, easing: 'ease-out' });
  }, [from]);
  function close() {
    const element = dialog.current, picture = image.current;
    if (closing.current || !element || !picture) return;
    closing.current = true;
    const moving = travel(picture, origin(), 'out');
    element.animate({ backgroundColor: [...shade].reverse() }, { duration: 320, easing: 'ease-in', fill: 'forwards' });
    const done = () => { element.close(); onClosed(); };
    if (moving) moving.finished.then(done, done); else done();
  }
  return <dialog ref={dialog} className="product-zoom" aria-label={alt}
    onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target !== image.current) close(); }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={image} src={src} alt={alt} width={size.width} height={size.height} />
  </dialog>;
}
