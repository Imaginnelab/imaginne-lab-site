'use client';

import type { ButtonHTMLAttributes } from 'react';

// Existing CSS draws the icon as a mask, centred independently of any font metrics.
export function ArrowButton({ gallery = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { gallery?: boolean }) {
  return <button type="button" className={gallery ? 'products-gallery-arrow' : 'products-arrow is-icon'} {...props}>
    {gallery ? null : <span aria-hidden="true" />}
  </button>;
}
