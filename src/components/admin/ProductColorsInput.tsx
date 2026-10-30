'use client';

import { useState } from 'react';
import type { AdminDictionary } from '@/i18n/admin-dictionaries';
import { MAX_COLOR_NAME, MAX_PRODUCT_COLORS, type ProductColor } from '@/lib/products/colors';

export function ProductColorsInput({ id, value, disabled, copy, onChange, error }: {
  id: string; value: ProductColor[]; disabled: boolean; copy: AdminDictionary['products']['specifications'];
  onChange: (value: ProductColor[]) => void; error?: string;
}) {
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#A6B69E');
  const [message, setMessage] = useState('');
  const colors = value;
  function add() {
    const label = name.trim();
    if (!label || /[\x00-\x1f\x7f]/.test(label)) { setMessage(copy.colorNameRequired); return; }
    if (colors.some((color) => color.name.toLowerCase() === label.toLowerCase())) { setMessage(copy.colorDuplicate); return; }
    if (colors.length >= MAX_PRODUCT_COLORS) { setMessage(copy.colorLimit); return; }
    onChange([...colors, { name: label, hex: hex.toUpperCase() }]); setName(''); setMessage('');
  }
  return <div className="product-field-wide product-colors-field">
    <label htmlFor={id}>{copy.colors}</label>
    <div className="product-color-entry">
      <input type="color" value={hex} onChange={(event) => setHex(event.target.value)} disabled={disabled} aria-label={copy.colorTone} />
      <input type="text" id={id} value={name} maxLength={MAX_COLOR_NAME} disabled={disabled} placeholder={copy.colorPlaceholder}
        aria-invalid={!!error || !!message} aria-describedby={id + '-hint ' + id + '-error'}
        onChange={(event) => { setName(event.target.value); setMessage(''); }}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} />
      <button className="btn btn-ghost btn-sm" type="button" disabled={disabled} onClick={add}><span aria-hidden="true">+</span>{copy.addColor}</button>
    </div>
    <p className="field-hint" id={id + '-hint'}>{copy.colorHint}</p>
    {colors.length ? <ul className="product-color-grid" aria-label={copy.colors}>{colors.map((color, index) => <li key={color.name}>
      <span className="product-color-swatch" style={color.hex ? { backgroundColor: color.hex } : undefined} aria-hidden="true" />
      <span>{color.name}</span><button type="button" disabled={disabled} aria-label={copy.removeColor.replace('{name}', color.name)}
        onClick={() => { onChange(colors.filter((_, position) => position !== index)); setMessage(''); }}>×</button>
    </li>)}</ul> : null}
    <p className="field-error" id={id + '-error'} role="status">{error || message}</p>
  </div>;
}
