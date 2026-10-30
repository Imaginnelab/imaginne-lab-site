'use client';

import { useId } from 'react';
import { MAX_CART_QUANTITY } from '@/lib/products/input';
import type { Dictionary } from '@/i18n/dictionaries';

export function QuantityControl({ value, onChange, copy, name, allowInvalid = false, invalid = false, describedBy }: {
  value: number; onChange: (value: number) => void;
  copy: Pick<Dictionary['store']['cart'], 'quantity' | 'decrease' | 'increase'>; name?: string;
  allowInvalid?: boolean; invalid?: boolean; describedBy?: string;
}) {
  const id = useId();
  return <div className="quantity-control" role="group" aria-label={copy.quantity + (name ? ': ' + name : '')}>
    <button type="button" onClick={() => onChange(value - 1)} disabled={!Number.isFinite(value) || value <= 1} aria-label={copy.decrease}>−</button>
    <label className="products-status" htmlFor={id}>{copy.quantity}</label>
    <input id={id} type="number" min={1} max={MAX_CART_QUANTITY} step={1} value={Number.isNaN(value) ? '' : value} inputMode="numeric" aria-invalid={invalid} aria-describedby={describedBy}
      onChange={(event) => {
        const next = event.currentTarget.valueAsNumber;
        if (allowInvalid || Number.isInteger(next) && next >= 1 && next <= MAX_CART_QUANTITY) onChange(next);
      }} />
    <button type="button" onClick={() => onChange((Number.isFinite(value) ? value : 0) + 1)} disabled={value >= MAX_CART_QUANTITY} aria-label={copy.increase}>+</button>
  </div>;
}
