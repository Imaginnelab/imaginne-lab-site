'use client';
import { useId } from 'react';
import { useProductSelection } from './ProductSelection';

// Colours as round swatches; the chosen colour's name shows beside the label, and each swatch
// carries its name for touch, hover (title) and screen readers.
export function ProductColorList({ label, missing }: { label: string; missing: string }) {
  const { colors, selected, choose, attempted } = useProductSelection();
  const error = attempted && !selected ? missing : undefined;
  const group = useId();
  if (!colors.length) return null;
  return <fieldset className="product-colour-options" id="product-colours" aria-describedby={error ? group + '-error' : undefined} aria-invalid={!!error}>
    <legend className="product-colour-label">{label}{selected ? <>: <span className="product-colour-chosen">{selected.name}</span></> : null}</legend>
    <ul className="product-detail-colors" aria-label={label}>
      {colors.map((color) => <li key={color.id}>
        <label title={color.name}><input type="radio" name={group} value={color.id} checked={selected?.id === color.id} onChange={() => choose(color.id)} />
          <span className="product-detail-swatch" style={color.hex ? { backgroundColor: color.hex } : undefined} aria-hidden="true" />
          <span className="product-colour-name">{color.name}</span>
        </label>
      </li>)}
    </ul>
    {error ? <p className="product-field-error" id={group + '-error'} role="alert">{error}</p> : null}
  </fieldset>;
}
