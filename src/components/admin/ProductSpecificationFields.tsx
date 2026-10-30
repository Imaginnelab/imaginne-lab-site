'use client';

import type { AdminDictionary } from '@/i18n/admin-dictionaries';
import type { Locale } from '@/i18n/config';
import { basicSpecificationFields, specificationLimits } from '@/lib/products/specifications';

type Props = {
  values: Record<string, string>; errors: Record<string, string>; copy: AdminDictionary['products']['specifications'];
  disabled: boolean; change: (key: string, value: string) => void;
};
export function ProductTranslatedSpecifications({ values, errors, copy, disabled, change, language }: Props & { language: Locale }) {
  return <>{basicSpecificationFields.map((field) => {
    const key = field + '_' + language, id = 'product-' + key;
    const props = { id, name: key, value: values[key] ?? '', maxLength: specificationLimits[field], disabled,
      lang: language === 'pt' ? 'pt-BR' : language, 'aria-invalid': !!errors[key], 'aria-describedby': id + '-error',
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(key, event.target.value) };
    return <div key={key} className={field === 'care' ? 'product-field-wide' : undefined}>
      <label htmlFor={id}>{copy[field]}</label>
      {field === 'care' ? <textarea {...props} rows={3} /> : <input {...props} type="text" autoComplete="off" />}
      <p className="field-error" id={id + '-error'}>{errors[key]}</p>
    </div>;
  })}</>;
}
const numeric = { width_cm: 'width', height_cm: 'height', depth_cm: 'depth', weight_g: 'weight', stock_quantity: 'stock' } as const;
export function ProductMeasurements({ values, errors, copy, disabled, change }: Props) {
  return <>{Object.entries(numeric).map(([key, label]) => {
      const stock = key === 'stock_quantity', id = 'product-' + key;
      return <div key={key}><label htmlFor={id}>{copy[label]}</label>
        <input id={id} name={key} type="number" inputMode={stock ? 'numeric' : 'decimal'} min={stock ? 0 : .01}
          max={stock ? 1_000_000 : key === 'weight_g' ? 10_000_000 : 10_000} step={stock ? 1 : .01}
          value={values[key] ?? ''} disabled={disabled} aria-invalid={!!errors[key]} aria-describedby={id + '-error'}
          onChange={(event) => change(key, event.target.value)} />
        <p className="field-error" id={id + '-error'}>{errors[key]}</p></div>;
    })}</>;
}
