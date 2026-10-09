'use client';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { AdminDictionary } from '@/i18n/admin-dictionaries';
import { formatFileSize } from '@/lib/products/format';
import { fill } from '@/lib/admin/client/text';
import { isPhotoType, MAX_SOURCE_BYTES, preparePhoto } from '@/lib/admin/client/photos';
import { inspectGlb, MAX_MODEL_BYTES, MODEL_TYPE } from '@/lib/admin/client/glb';
import type { ModelItem, PhotoItem } from '@/lib/admin/client/storage';
import { ModelPreview } from './ModelPreview';
type Copy = AdminDictionary['products'];
function Icon({ kind }: { kind: 'add' | 'model' | 'up' | 'down' | 'remove' }) {
  const small = ['up', 'down', 'remove'].includes(kind);
  const paths = { add: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 18v-6M9.5 14.5 12 12l2.5 2.5',
    model: 'M12 3 4 7.5v9L12 21l8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9', up: 'm4 10 4-4 4 4', down: 'm4 6 4 4 4-4', remove: 'm4 4 8 8M12 4l-8 8' };
  return <svg className="icon" viewBox={small ? '0 0 16 16' : '0 0 24 24'} aria-hidden="true" focusable="false"><path d={paths[kind]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export function MediaPicker({ locale, copy, photos, setPhotos, model, setModel, disabled, processing, error, errors }: {
  locale: string; copy: Copy; photos: PhotoItem[]; setPhotos: Dispatch<SetStateAction<PhotoItem[]>>;
  model: ModelItem | null; setModel: Dispatch<SetStateAction<ModelItem | null>>; disabled: boolean;
  processing: (busy: boolean) => void; error: (key: string, message: string) => void; errors: Record<string, string>;
}) {
  const [photoBusy, setPhotoBusy] = useState(false);
  const [modelBusy, setModelBusy] = useState(false);
  const [quality, setQuality] = useState(2048);
  const alive = useRef(true), modelVersion = useRef(0);
  const owned = useRef(new Set<string>());
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; modelVersion.current++; owned.current.forEach((url) => URL.revokeObjectURL(url)); owned.current.clear(); };
  }, []);
  useEffect(() => {
    const used = new Set(photos.filter((item) => item.kind === 'new').map((item) => item.url));
    owned.current.forEach((url) => { if (!used.has(url)) { URL.revokeObjectURL(url); owned.current.delete(url); } });
  }, [photos]);
  async function addPhotos(files: File[]) {
    if (photoBusy || modelBusy || disabled) return;
    error('photo', '');
    const room = 6 - photos.length;
    if (files.length > room) error('photo', copy.photoMax);
    processing(true); setPhotoBusy(true);
    try {
      for (const file of files.slice(0, room)) {
        if (!isPhotoType(file.type)) { error('photo', fill(copy.photoType, { name: file.name })); continue; }
        if (file.size > MAX_SOURCE_BYTES) { error('photo', fill(copy.photoSource, { name: file.name })); continue; }
        if (!alive.current) return;
        const url = URL.createObjectURL(file), id = crypto.randomUUID();
        owned.current.add(url);
        setPhotos((items) => [...items, { id, kind: 'new', name: file.name, url, sourceBytes: file.size, optimizing: true }]);
        const blob = await preparePhoto(file);
        if (!alive.current) return;
        if (!blob) {
          setPhotos((items) => items.filter((item) => item.id !== id));
          error('photo', fill(copy.photoSize, { name: file.name }));
        } else setPhotos((items) => items.map((item) => item.id === id ? { ...item, blob, optimizing: false } : item));
      }
    } finally { if (alive.current) { setPhotoBusy(false); processing(false); } }
  }
  async function chooseModel(file: File, maxTexture = quality) {
    if (disabled || modelBusy || photoBusy) return;
    const stamp = ++modelVersion.current;
    error('model', '');
    if (!/\.glb$/i.test(file.name)) { error('model', fill(copy.modelExt, { name: file.name })); return; }
    if (!file.size || file.size > MAX_MODEL_BYTES) { error('model', fill(copy.modelSize, { name: file.name })); return; }
    processing(true); setModelBusy(true);
    try {
      const info = inspectGlb(new Uint8Array(await file.arrayBuffer()));
      if (!alive.current || stamp !== modelVersion.current) return;
      if (!info.ok) { error('model', fill(info.external ? copy.modelExternal : copy.modelInvalid, { name: file.name })); return; }
      setModel({ kind: 'new', name: file.name, bytes: file.size, blob: file.slice(0, file.size, MODEL_TYPE), original: file });
      const optimizer = await import('@/lib/admin/client/model-optimize').catch(() => null);
      const optimized = optimizer ? await optimizer.optimizeModel(file, { maxTexture }).catch(() => null) : null;
      if (!alive.current || stamp !== modelVersion.current) return;
      // Original fallback is safe only because inspectGlb succeeded above.
      const blob = optimized?.blob ?? file.slice(0, file.size, MODEL_TYPE);
      if (!inspectGlb(new Uint8Array(await blob.arrayBuffer())).ok) { error('model', fill(copy.modelInvalid, { name: file.name })); return; }
      if (alive.current && stamp === modelVersion.current) setModel({ kind: 'new', name: file.name, bytes: blob.size, blob, original: file });
    } catch { if (alive.current && stamp === modelVersion.current) error('model', fill(copy.modelInvalid, { name: file.name })); }
    finally { if (alive.current && stamp === modelVersion.current) { setModelBusy(false); processing(false); } }
  }
  const lock = disabled || photoBusy || modelBusy;
  function reorder(id: string, target: number) {
    setPhotos((items) => {
      const current = items.findIndex((item) => item.id === id);
      if (current < 0) return items;
      const next = [...items]; const [photo] = next.splice(current, 1); next.splice(target, 0, photo); return next;
    });
  }
  return <div className="product-media">
    <div className="product-photo">
      <p className="field-label" id="product-photos-label">{copy.photos}</p>
      <ul id="product-photos" className="photo-list" aria-labelledby="product-photos-label" hidden={!photos.length}>
        {photos.map((item, index) => <li className={'photo-item' + (!index ? ' is-cover' : '')} key={item.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="photo-thumb" src={item.url} alt={fill(copy.photoThumbAlt, { n: index + 1 })} width={56} height={56} decoding="async" />
          <div className="photo-info"><p className="photo-name">{item.kind === 'saved' ? copy.savedPhoto : item.kind === 'copy' ? copy.copiedPhoto : item.name}</p>
            <p className="photo-meta">{item.optimizing ? copy.optimizing : item.blob ? (item.sourceBytes && item.blob.size < item.sourceBytes ? formatFileSize(item.sourceBytes, locale) + ' → ' : '') + formatFileSize(item.blob.size, locale) : ''}</p></div>
          <div className="photo-actions">
            <button className="photo-btn" type="button" disabled={lock || !index} aria-label={fill(copy.makeCoverLabel, { n: index + 1 })} onClick={() => reorder(item.id, 0)}>{index ? copy.makeCover : copy.cover}</button>
            <button className="photo-btn photo-btn-icon" type="button" disabled={lock || !index} aria-label={fill(copy.moveUpLabel, { n: index + 1 })} onClick={() => reorder(item.id, index - 1)}><Icon kind="up" /></button>
            <button className="photo-btn photo-btn-icon" type="button" disabled={lock || index === photos.length - 1} aria-label={fill(copy.moveDownLabel, { n: index + 1 })} onClick={() => reorder(item.id, index + 1)}><Icon kind="down" /></button>
            <button className="photo-btn photo-btn-icon photo-btn-remove" type="button" disabled={lock} aria-label={fill(copy.removeLabel, { n: index + 1 })} onClick={() => setPhotos((items) => items.filter((photo) => photo.id !== item.id))}><Icon kind="remove" /></button>
          </div>
        </li>)}
      </ul>
      <input className="file-input" id="product-photo" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={lock}
        aria-invalid={!!errors.photo} aria-describedby="product-photo-hint product-photo-error"
        onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void addPhotos(files); }} />
      <label className="btn btn-ghost btn-sm file-button" htmlFor="product-photo" aria-busy={photoBusy ? 'true' : undefined}><Icon kind="add" /><span>{copy.addPhotos}</span></label>
      <p className="field-hint" id="product-photo-hint">{copy.photoHint}</p><p className="field-error" id="product-photo-error">{errors.photo}</p>
    </div>
    <div className="product-model">
      <p className="field-label" id="product-model-label">{copy.model}</p>
      {model ? <div className="photo-item model-item" id="product-model-item">
        {!modelBusy ? <ModelPreview item={model} label={copy.modelAlt} /> : null}
        <div className="photo-info"><p className="photo-name">{model.kind === 'saved' ? copy.savedModel : model.kind === 'copy' ? copy.copiedModel : model.name}</p>
          <p className="photo-meta">{model.kind === 'new' && model.original ? formatFileSize(model.original.size, locale) + (modelBusy ? ' · ' + copy.optimizingModel : model.bytes && model.bytes < model.original.size ? ' → ' + formatFileSize(model.bytes, locale) : '') : ''}</p></div>
        <div className="photo-actions"><button className="photo-btn photo-btn-icon photo-btn-remove" type="button" disabled={lock} aria-label={copy.removeModel}
          onClick={() => { modelVersion.current++; setModel(null); error('model', ''); }}><Icon kind="remove" /></button></div>
      </div> : null}
      <input className="file-input" id="product-model" type="file" accept=".glb,model/gltf-binary" disabled={lock}
        aria-invalid={!!errors.model} aria-describedby="product-model-hint product-model-error"
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void chooseModel(file); }} />
      <label className="btn btn-ghost btn-sm file-button" htmlFor="product-model" aria-busy={modelBusy ? 'true' : undefined}><Icon kind="model" /><span>{model ? copy.replaceModel : copy.addModel}</span></label>
      <p className="field-hint" id="product-model-hint">{copy.modelHint}</p>
      <p className="field-hint model-warning" role="status">{model?.kind === 'new' && model.bytes && model.bytes > 5 * 1024 * 1024 && !modelBusy ? copy.modelHeavy : ''}</p>
      <p className="field-error" id="product-model-error">{errors.model}</p>
      <div className="model-quality"><label htmlFor="product-model-quality">{copy.textureQuality}</label>
        <select id="product-model-quality" disabled={lock} value={quality} onChange={(event) => { const next = Number(event.target.value); setQuality(next); if (model?.original) void chooseModel(model.original, next); }}>
          <option value={2048}>{copy.texture2048}</option><option value={1024}>{copy.texture1024}</option>
        </select></div>
    </div>
  </div>;
}
