'use client';
import { useId } from 'react';
import { useProductSelection } from './ProductSelection';

export function ProductColorList({ label, error }: { label: string; error?: string }) {
  const { colors, selected, choose } = useProductSelection();
  const group = useId();
  if (!colors.length) return null;
  return <fieldset className="product-colour-options" aria-describedby={error ? group + '-error' : undefined} aria-invalid={!!error}>
    <legend className="product-colour-label">{label}{selected ? ': ' + selected.name : ''}</legend>
    <ul className="product-detail-colors" aria-label={label}>
      {colors.map((color) => <li key={color.id}>
        <label><input type="radio" name={group} value={color.id} checked={selected?.id === color.id} onChange={() => choose(color.id)} />
          <span className="product-detail-swatch" style={color.hex ? { backgroundColor: color.hex } : undefined} aria-hidden="true" />
          <span>{color.name}</span>
        </label>
      </li>)}
    </ul>
    {error ? <p className="product-field-error" id={group + '-error'} role="alert">{error}</p> : null}
  </fieldset>;
}
