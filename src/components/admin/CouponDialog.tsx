'use client';
import { useRef, useState, useTransition } from 'react';
import type { AdminDictionary } from '@/i18n/admin-dictionaries';
import type { AdminCoupon } from '@/lib/admin/queries';
import type { CouponInput } from '@/lib/admin/schemas';
import { createCoupon, updateCoupon } from '@/lib/admin/actions';
import { parsePrice } from '@/lib/products/format';
import { failureMessage, fill, isoToLocal, localToIso } from '@/lib/admin/client/text';
import { Dialog } from './Dialog';
export function CouponDialog({ source, copy, close, done }: {
  source: AdminCoupon | null; copy: AdminDictionary['coupons']; close: () => void; done: (message: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => ({
    code: source?.code ?? '', value: source?.discount_type === 'amount' ? ((source.amount_off_cad_cents ?? 0) / 100).toFixed(2) : String(source?.percent_off ?? ''),
    max: source?.max_uses == null ? '' : String(source.max_uses), start: isoToLocal(source?.starts_at ?? null), end: isoToLocal(source?.expires_at ?? null),
  }));
  const [type, setType] = useState<'percent' | 'amount'>(source?.discount_type === 'amount' ? 'amount' : 'percent');
  const [active, setActive] = useState(source?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [pending, start] = useTransition();
  const lock = useRef(false), form = useRef<HTMLFormElement>(null);
  const title = source ? copy.editTitle : copy.newTitle;
  function validate(): CouponInput | null {
    const invalid: Record<string, string> = {}, code = values.code.trim().toUpperCase();
    const discount = type === 'percent' ? Number(values.value.replace(',', '.')) : parsePrice(values.value);
    const max = values.max.trim() ? Number(values.max) : null;
    const starts = localToIso(values.start), ends = localToIso(values.end);
    if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) invalid.code = !code ? copy.required : copy.codeInvalid;
    if (!values.value.trim()) invalid.value = copy.required;
    else if (type === 'percent' && (!Number.isInteger(discount) || discount === null || discount < 1 || discount > 100)) invalid.value = copy.percentInvalid;
    else if (type === 'amount' && (discount === null || !Number.isInteger(discount) || discount < 1)) invalid.value = copy.amountInvalid;
    else if (type === 'amount' && discount !== null && discount > 100_000_000) invalid.value = copy.amountTooHigh;
    if (max !== null && (!Number.isInteger(max) || max < 1 || max > 1_000_000)) invalid.max = copy.maxInvalid;
    if (typeof starts === 'number') invalid.start = copy.dateInvalid;
    if (typeof ends === 'number') invalid.end = copy.dateInvalid;
    if (typeof starts === 'string' && typeof ends === 'string' && Date.parse(ends) <= Date.parse(starts)) invalid.end = copy.endBeforeStart;
    if (Object.keys(invalid).length) {
      setErrors(invalid); setError(copy.fixErrors);
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return null;
    }
    setErrors({}); setError('');
    return { code, discount_type: type, percent_off: type === 'percent' ? discount : null, amount_off_cad_cents: type === 'amount' ? discount : null,
      max_uses: max, starts_at: typeof starts === 'string' ? starts : null, expires_at: typeof ends === 'string' ? ends : null, is_active: active };
  }
  const fields = [
    { key: 'code', label: copy.code, hint: copy.codeHint, type: 'text', wide: true },
    { key: 'value', label: type === 'percent' ? copy.valuePercent : copy.valueAmount, hint: '', type: 'text' },
    { key: 'max', label: copy.maxUses, hint: copy.maxUsesHint, type: 'number' },
    { key: 'start', label: copy.startsAt, hint: copy.optional, type: 'datetime-local' },
    { key: 'end', label: copy.expiresAt, hint: copy.optional, type: 'datetime-local' },
  ];
  const renderField = (field: typeof fields[number]) => {
    const id = 'coupon-' + field.key;
    return <div className={field.wide ? 'coupon-wide' : undefined} key={field.key}>
      <label htmlFor={id}>{field.label}</label>
      <input id={id} name={field.key} type={field.type} value={values[field.key]} disabled={pending}
        required={field.key === 'code' || field.key === 'value'} maxLength={field.key === 'code' ? 32 : undefined} autoComplete="off" spellCheck={field.key === 'code' ? false : undefined}
        autoCapitalize={field.key === 'code' ? 'characters' : undefined} inputMode={field.key === 'max' ? 'numeric' : field.key === 'value' ? 'decimal' : undefined}
        min={field.key === 'max' ? 1 : undefined} max={field.key === 'max' ? 1000000 : undefined} step={field.key === 'max' ? 1 : undefined}
        aria-invalid={!!errors[field.key]} aria-describedby={id + '-hint ' + id + '-error'}
        onChange={(event) => { const value = event.target.value; setValues((current) => ({ ...current, [field.key]: field.key === 'code' ? value.toUpperCase() : value })); setErrors((current) => ({ ...current, [field.key]: '' })); }} />
      <p className="field-hint" id={id + '-hint'}>{field.hint}</p><p className="field-error" id={id + '-error'}>{errors[field.key]}</p>
    </div>;
  };
  return <Dialog id="coupon-dialog" title={title} close={close} busy={pending} size="admin-dialog-medium" initialFocus="#coupon-code">
    <form ref={form} id="coupon-form" className="product-form" noValidate onSubmit={(event) => {
      event.preventDefault(); if (lock.current || uncertain) return;
      const input = validate(); if (!input) return; lock.current = true;
      start(async () => {
        try {
          const result = source ? await updateCoupon(source.id, input) : await createCoupon(input);
          if (result.ok) done(source ? copy.saved : copy.created); else setError(failureMessage(result.code, copy));
        } catch { setUncertain(true); setError(copy.uncertain); }
        finally { lock.current = false; }
      });
    }}>
      <div className="admin-dialog-head"><h2 id="coupon-dialog-title">{title}</h2><button className="admin-dialog-close" type="button" disabled={pending} aria-label={copy.close} onClick={close}>×</button></div>
      <div className="coupon-grid">
        {renderField(fields[0])}
        <fieldset className="coupon-type coupon-wide"><legend>{copy.type}</legend>
          <label className="field-check"><input type="radio" name="discount_type" value="percent" checked={type === 'percent'} disabled={pending} onChange={() => setType('percent')} /><span>{copy.typePercent}</span></label>
          <label className="field-check"><input type="radio" name="discount_type" value="amount" checked={type === 'amount'} disabled={pending} onChange={() => setType('amount')} /><span>{copy.typeAmount}</span></label>
        </fieldset>
        {fields.slice(1).map(renderField)}
        <label className="field-check coupon-wide"><input id="coupon-active" type="checkbox" checked={active} disabled={pending} onChange={(event) => setActive(event.target.checked)} /><span>{copy.activeLabel}</span></label>
        <p className="field-hint coupon-wide" id="coupon-used">{source ? fill(copy.usedSoFar, { used: source.used_count }) : ''}</p>
      </div>
      <p className="form-error" role="alert">{error}</p>
      <div className="admin-dialog-actions"><button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={close}>{copy.cancel}</button>
        <button id="coupon-save" className="btn btn-primary btn-sm" type="submit" disabled={pending || uncertain} aria-busy={pending ? 'true' : undefined}>{pending ? copy.saving : copy.save}</button></div>
    </form>
  </Dialog>;
}
