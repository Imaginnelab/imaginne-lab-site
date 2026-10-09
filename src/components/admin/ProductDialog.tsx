'use client';
import { useCallback, useRef, useState, useTransition } from 'react';
import type { AdminDictionary } from '@/i18n/admin-dictionaries';
import type { Locale } from '@/i18n/config';
import type { AdminProduct } from '@/lib/admin/queries';
import type { ProductInput } from '@/lib/admin/schemas';
import { createProduct, updateProduct } from '@/lib/admin/actions';
import { SUPABASE_URL } from '@/lib/env';
import { copyName, imagePaths, imageUrl, parsePrice } from '@/lib/products/format';
import { fill, failureMessage } from '@/lib/admin/client/text';
import { discardUploads, uploadModel, uploadPhotos, type PhotoItem, type ModelItem, type Uploaded } from '@/lib/admin/client/storage';
import { Dialog } from './Dialog';
import { MediaPicker } from './MediaPicker';
const langs = ['pt', 'en', 'es'] as const;
type Copy = AdminDictionary['products'];
export function ProductDialog({ source, duplicate, locale, copy, close, done }: {
  source: AdminProduct | null; duplicate: boolean; locale: Locale; copy: Copy; close: () => void; done: (message: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const fields: Record<string, string> = {};
    for (const lang of langs) {
      const nameKey = `name_${lang}` as const, descriptionKey = `description_${lang}` as const;
      fields[nameKey] = duplicate ? copyName(source?.[nameKey] ?? '', copy.copySuffix[lang]) : source?.[nameKey] ?? '';
      fields[descriptionKey] = source?.[descriptionKey] ?? '';
    }
    return { ...fields, price: source?.price_cad_cents == null ? '' : (source.price_cad_cents / 100).toFixed(2), sort_order: String(source?.sort_order ?? 0) };
  });
  const [active, setActive] = useState(duplicate ? false : source?.is_active ?? true);
  const [photos, setPhotos] = useState<PhotoItem[]>(() => imagePaths(source).map((path) => ({
    id: crypto.randomUUID(), kind: duplicate ? 'copy' : 'saved', path, name: '', url: imageUrl(SUPABASE_URL, path),
  })));
  const [model, setModel] = useState<ModelItem | null>(() => source?.model_path ? {
    kind: duplicate ? 'copy' : 'saved', path: source.model_path, name: '', bytes: source.model_bytes,
  } : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [mediaBusy, setMediaBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [pending, start] = useTransition();
  const lock = useRef(false);
  const mediaLock = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const setMediaError = useCallback((key: string, message: string) => setErrors((current) => ({ ...current, [key]: message })), []);
  const processing = useCallback((busy: boolean) => { mediaLock.current = busy; setMediaBusy(busy); }, []);
  const title = duplicate ? copy.copyTitle : source ? copy.editTitle : copy.newTitle;
  function validate(): Omit<ProductInput, 'image_path' | 'extra_image_paths' | 'model_path' | 'model_bytes'> | null {
    const invalid: Record<string, string> = {};
    const translated: Record<string, string> = {};
    for (const lang of langs) for (const kind of ['name', 'description']) {
      const key = kind + '_' + lang, value = (values[key] ?? '').trim(), max = kind === 'name' ? 120 : 600;
      translated[key] = value;
      if (!value) invalid[key] = copy.required;
      else if (value.length > max) invalid[key] = fill(copy.tooLong, { max });
    }
    const cents = parsePrice(values.price), order = values.sort_order.trim() ? Number(values.sort_order) : 0;
    if (Number.isNaN(cents) || cents !== null && cents < 0) invalid.price = copy.priceInvalid;
    else if (cents !== null && cents > 100_000_000) invalid.price = copy.priceTooHigh;
    if (!Number.isInteger(order) || Math.abs(order) > 100_000) invalid.sort_order = copy.orderInvalid;
    if (!photos.length) invalid.photo = copy.photoRequired;
    if (Object.keys(invalid).length) {
      setErrors(invalid); setError(copy.fixErrors);
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return null;
    }
    setErrors({}); setError('');
    return { name_pt: translated.name_pt, name_en: translated.name_en, name_es: translated.name_es,
      description_pt: translated.description_pt, description_en: translated.description_en, description_es: translated.description_es,
      price_cad_cents: cents, sort_order: order, is_active: active };
  }
  return <Dialog id="product-dialog" title={title} close={close} busy={pending} initialFocus="#product-name-pt">
    <form ref={form} id="product-form" className="product-form" noValidate onSubmit={(event) => {
      event.preventDefault();
      if (lock.current || mediaLock.current || uncertain) return;
      const input = validate(); if (!input) return;
      lock.current = true;
      start(async () => {
        const uploaded: Uploaded[] = [];
        let writing = false, uploadStage: 'photo' | 'model' = 'photo';
        try {
          const paths = await uploadPhotos(photos, uploaded);
          uploadStage = 'model';
          const storedModel = await uploadModel(model, uploaded);
          const data: ProductInput = { ...input, image_path: paths[0], extra_image_paths: paths.slice(1), model_path: storedModel.path, model_bytes: storedModel.bytes };
          writing = true;
          const result = source && !duplicate ? await updateProduct(source.id, data) : await createProduct(data);
          if (result.ok) done(source && !duplicate ? copy.saved : copy.created);
          else { await discardUploads(uploaded); setError(failureMessage(result.code, copy)); }
        } catch {
          if (writing) {
            // A transport failure may follow a committed write. Never delete referenced media.
            setUncertain(true); setError(copy.uncertain);
          } else { await discardUploads(uploaded); setError(duplicate ? copy.copyError : uploadStage === 'model' ? copy.modelUploadError : copy.photoUploadError); }
        } finally { lock.current = false; }
      });
    }}>
      <div className="admin-dialog-head"><h2 id="product-dialog-title">{title}</h2><button className="admin-dialog-close" type="button" aria-label={copy.close} disabled={pending} onClick={close}>×</button></div>
      <div className="product-langs">{langs.map((lang) => <fieldset className="product-lang" key={lang} data-lang={lang}>
        <legend lang={lang === 'pt' ? 'pt-BR' : lang}>{copy.languages[lang]}</legend>
        {(['name', 'description'] as const).map((kind) => {
          const key = kind + '_' + lang, id = 'product-' + kind + '-' + lang, max = kind === 'name' ? 120 : 600;
          const props = { id, name: key, value: values[key] ?? '', maxLength: max, required: true, disabled: pending,
            lang: lang === 'pt' ? 'pt-BR' : lang, 'aria-invalid': !!errors[key], 'aria-describedby': id + '-error',
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setValues((current) => ({ ...current, [key]: event.target.value })); setMediaError(key, ''); } };
          return <div key={kind}><label htmlFor={id}>{copy[kind]}</label><div className="field-row">
            {kind === 'name' ? <input {...props} type="text" autoComplete="off" /> : <textarea {...props} rows={5} />}
            <span className="field-count" aria-hidden="true">{(values[key] ?? '').length} / {max}</span></div>
            <p className="field-error" id={id + '-error'}>{errors[key]}</p></div>;
        })}
      </fieldset>)}</div>
      <div className="product-details">
        <MediaPicker locale={locale} copy={copy} photos={photos} setPhotos={setPhotos} model={model} setModel={setModel}
          disabled={pending} processing={processing} error={setMediaError} errors={errors} />
        <div className="product-meta">
          {(['price', 'sort_order'] as const).map((key) => {
            const id = key === 'price' ? 'product-price' : 'product-order';
            return <div key={key}><label htmlFor={id}>{key === 'price' ? copy.price : copy.order}</label>
              <input id={id} name={key} type={key === 'price' ? 'text' : 'number'} inputMode={key === 'price' ? 'decimal' : 'numeric'}
                min={key === 'price' ? undefined : -100000} max={key === 'price' ? undefined : 100000} step={key === 'price' ? undefined : 1}
                value={values[key]} disabled={pending} autoComplete="off" aria-invalid={!!errors[key]} aria-describedby={id + '-hint ' + id + '-error'}
                onChange={(event) => { setValues((current) => ({ ...current, [key]: event.target.value })); setMediaError(key, ''); }} />
              <p className="field-hint" id={id + '-hint'}>{key === 'price' ? copy.priceHint : copy.orderHint}</p><p className="field-error" id={id + '-error'}>{errors[key]}</p></div>;
          })}
          <label className="field-check"><input id="product-active" type="checkbox" checked={active} disabled={pending} onChange={(event) => setActive(event.target.checked)} /><span>{copy.activeLabel}</span></label>
        </div>
      </div>
      <p className="form-error" role="alert">{error}</p>
      <div className="admin-dialog-actions"><button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={close}>{copy.cancel}</button>
        <button className="btn btn-primary btn-sm" id="product-save" type="submit" disabled={pending || mediaBusy || uncertain}
          aria-busy={pending || mediaBusy ? 'true' : undefined}>{pending ? copy.saving : copy.save}</button></div>
    </form>
  </Dialog>;
}
