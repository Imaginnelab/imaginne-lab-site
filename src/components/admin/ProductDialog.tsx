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
import { productSpecificationsSchema } from '@/lib/products/specifications-schema';
import { specificationFields } from '@/lib/products/specifications';
import { productColorsSchema, type ProductColor } from '@/lib/products/colors';
import { ProductColorsInput } from './ProductColorsInput';
import { ProductMeasurements, ProductTranslatedSpecifications } from './ProductSpecificationFields';
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
      for (const kind of specificationFields) {
        const key = `${kind}_${lang}` as const;
        fields[key] = source?.[key] ?? '';
      }
    }
    for (const key of ['width_cm', 'height_cm', 'depth_cm', 'weight_g', 'stock_quantity'] as const) fields[key] = source?.[key] == null ? '' : String(source[key]);
    return { ...fields, price: source?.price_cad_cents == null ? '' : (source.price_cad_cents / 100).toFixed(2), sort_order: String(source?.sort_order ?? 0) };
  });
  const [colors, setColors] = useState<Record<Locale, ProductColor[]>>(() => ({
    pt: source?.colors.filter((color) => color.locale === 'pt').map(({ name, hex }) => ({ name, hex })) ?? [],
    en: source?.colors.filter((color) => color.locale === 'en').map(({ name, hex }) => ({ name, hex })) ?? [],
    es: source?.colors.filter((color) => color.locale === 'es').map(({ name, hex }) => ({ name, hex })) ?? [],
  }));
  const [active, setActive] = useState(duplicate ? false : source?.is_active ?? true);
  const [language, setLanguage] = useState<Locale>(locale);
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
  const change = (key: string, value: string) => { setValues((current) => ({ ...current, [key]: value })); setMediaError(key, ''); };
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
    const specifications: Record<string, unknown> = Object.fromEntries(langs.flatMap((lang) => specificationFields.map((field) => [field + '_' + lang, values[field + '_' + lang] ?? ''])));
    for (const key of ['width_cm', 'height_cm', 'depth_cm', 'weight_g', 'stock_quantity']) specifications[key] = values[key]?.trim() ? Number(values[key].replace(',', '.')) : null;
    const parsedSpecifications = productSpecificationsSchema.safeParse(specifications);
    if (!parsedSpecifications.success) for (const issue of parsedSpecifications.error.issues) {
      const key = String(issue.path[0]);
      invalid[key] = copy.specifications.invalid;
    }
    const allColors = langs.flatMap((locale) => colors[locale].map((color) => ({ ...color, locale })));
    const parsedColors = productColorsSchema.safeParse(allColors);
    if (!parsedColors.success) for (const issue of parsedColors.error.issues) {
      const lang = allColors[Number(issue.path[0])]?.locale ?? language;
      invalid['colors_' + lang] = copy.specifications.invalid;
    }
    if (Object.keys(invalid).length) {
      setErrors(invalid); setError(copy.fixErrors);
      const firstLanguage = langs.find((lang) => Object.keys(invalid).some((key) => key.endsWith('_' + lang)));
      if (firstLanguage) setLanguage(firstLanguage);
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return null;
    }
    setErrors({}); setError('');
    if (!parsedSpecifications.success || !parsedColors.success) return null;
    return { ...parsedSpecifications.data, colors: parsedColors.data, name_pt: translated.name_pt, name_en: translated.name_en, name_es: translated.name_es,
      description_pt: translated.description_pt, description_en: translated.description_en, description_es: translated.description_es,
      price_cad_cents: cents, sort_order: order, is_active: active };
  }
  return <Dialog id="product-dialog" title={title} close={close} busy={pending} initialFocus={'#product-name-' + locale}>
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
      <FormSection id="product-basic" step="01" title={copy.specifications.basicData}>
        <div className="product-language-buttons" role="group" aria-label={copy.specifications.translated}>{langs.map((lang) =>
          <button key={lang} type="button" aria-pressed={language === lang} disabled={pending} onClick={() => setLanguage(lang)}>{copy.languages[lang]}</button>)}</div>
        <p className="product-language-help">{copy.specifications.languageHint}</p>
        {langs.map((lang) => <fieldset className="product-basic-grid" key={lang} data-lang={lang} hidden={language !== lang}>
          <legend className="navigation-sr-only">{copy.languages[lang]}</legend>
          {(['name', 'description'] as const).map((kind) => {
            const key = kind + '_' + lang, id = 'product-' + kind + '-' + lang, max = kind === 'name' ? 120 : 600;
            const props = { id, name: key, value: values[key] ?? '', maxLength: max, required: true, disabled: pending,
              lang: lang === 'pt' ? 'pt-BR' : lang, 'aria-invalid': !!errors[key], 'aria-describedby': id + '-error',
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(key, event.target.value) };
            return <div key={kind} className="product-field-wide"><label htmlFor={id}>{copy[kind]}</label><div className="field-row">
              {kind === 'name' ? <input {...props} type="text" autoComplete="off" /> : <textarea {...props} rows={3} />}
              <span className="field-count" aria-hidden="true">{(values[key] ?? '').length} / {max}</span></div>
              <p className="field-error" id={id + '-error'}>{errors[key]}</p></div>;
          })}
          <ProductTranslatedSpecifications values={values} errors={errors} copy={copy.specifications} disabled={pending} change={change} language={lang} />
          <ProductColorsInput id={'product-colors_' + lang} value={colors[lang]} disabled={pending} copy={copy.specifications}
            onChange={(value) => { setColors((current) => ({ ...current, [lang]: value })); setMediaError('colors_' + lang, ''); }} error={errors['colors_' + lang]} />
        </fieldset>)}
      </FormSection>
      <FormSection id="product-technical" step="02" title={copy.specifications.technicalData} hint={copy.specifications.optionalHint}>
        <div className="product-measurement-grid">
          <ProductMeasurements values={values} errors={errors} copy={copy.specifications} disabled={pending} change={change} />
          <div><label htmlFor="product-price">{copy.price}</label>
            <input id="product-price" name="price" type="text" inputMode="decimal" value={values.price} disabled={pending}
              autoComplete="off" aria-invalid={!!errors.price} aria-describedby="product-price-hint product-price-error"
              onChange={(event) => change('price', event.target.value)} />
            <p className="field-hint" id="product-price-hint">{copy.priceHint}</p><p className="field-error" id="product-price-error">{errors.price}</p>
          </div>
        </div>
        <div className="product-publication-settings">
          <div><label htmlFor="product-order">{copy.order}</label>
            <input id="product-order" name="sort_order" type="number" min={-100000} max={100000} step={1} value={values.sort_order}
              disabled={pending} aria-invalid={!!errors.sort_order} aria-describedby="product-order-hint product-order-error"
              onChange={(event) => change('sort_order', event.target.value)} />
            <p className="field-hint" id="product-order-hint">{copy.orderHint}</p><p className="field-error" id="product-order-error">{errors.sort_order}</p>
          </div>
          <label className="field-check"><input id="product-active" type="checkbox" checked={active} disabled={pending} onChange={(event) => setActive(event.target.checked)} /><span>{copy.activeLabel}</span></label>
        </div>
      </FormSection>
      <FormSection id="product-media-section" step="03" title={copy.specifications.photosModel}>
        <MediaPicker locale={locale} copy={copy} photos={photos} setPhotos={setPhotos} model={model} setModel={setModel}
          disabled={pending} processing={processing} error={setMediaError} errors={errors} />
      </FormSection>
      <p className="form-error" role="alert">{error}</p>
      <div className="admin-dialog-actions"><button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={close}>{copy.cancel}</button>
        <button className="btn btn-primary btn-sm" id="product-save" type="submit" disabled={pending || mediaBusy || uncertain}
          aria-busy={pending || mediaBusy ? 'true' : undefined}>{pending ? copy.saving : copy.save}</button></div>
    </form>
  </Dialog>;
}

function FormSection({ id, step, title, hint, children }: {
  id: string; step: string; title: string; hint?: string; children: React.ReactNode;
}) {
  return <section className="product-form-section" id={id} aria-labelledby={id + '-heading'}>
    <div className="product-section-heading"><span aria-hidden="true">{step}</span><div><h3 id={id + '-heading'}>{title}</h3>{hint ? <p>{hint}</p> : null}</div></div>
    {children}
  </section>;
}
