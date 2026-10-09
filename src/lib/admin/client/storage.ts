import { createClient } from '@/lib/supabase/client';
import { SUPABASE_URL } from '@/lib/env';
import { imageUrl, modelUrl } from '@/lib/products/format';
import { inspectGlb, MAX_MODEL_BYTES, MODEL_TYPE } from './glb';
import { isPhotoType, MAX_PHOTO_BYTES, PHOTO_TYPES } from './photos';
export type Uploaded = { bucket: 'product-images' | 'product-models'; path: string };
export type PhotoItem = { id: string; kind: 'saved' | 'copy' | 'new'; path?: string; name: string; url: string; blob?: Blob; sourceBytes?: number; optimizing?: boolean };
export type ModelItem = { kind: 'saved' | 'copy' | 'new'; path?: string; name: string; bytes: number | null; blob?: Blob; original?: File };
export async function fetchStored(url: string, max: number, signal?: AbortSignal): Promise<Blob> {
  if (!url) throw Error('Invalid storage path');
  const response = await fetch(url, { credentials: 'omit', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000) });
  if (!response.ok || Number(response.headers.get('content-length')) > max || !response.body) { await response.body?.cancel(); throw Error('Unavailable file'); }
  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw Error('File too large'); }
      chunks.push(new Uint8Array(value).buffer);
    }
  } finally { reader.releaseLock(); }
  if (!size) throw Error('Empty file');
  return new Blob(chunks, { type: response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '' });
}
export async function validatedModel(item: ModelItem, signal?: AbortSignal): Promise<Blob> {
  const blob = item.blob ?? await fetchStored(modelUrl(SUPABASE_URL, item.path), MAX_MODEL_BYTES, signal);
  if (!inspectGlb(new Uint8Array(await blob.arrayBuffer())).ok) throw Error('Invalid model');
  return blob.slice(0, blob.size, MODEL_TYPE);
}
export async function uploadPhotos(items: PhotoItem[], uploaded: Uploaded[]): Promise<string[]> {
  const client = createClient();
  const paths: string[] = [];
  for (const item of items) {
    if (item.kind === 'saved' && item.path) { paths.push(item.path); continue; }
    const blob = item.blob ?? await fetchStored(imageUrl(SUPABASE_URL, item.path), MAX_PHOTO_BYTES);
    if (!isPhotoType(blob.type) || blob.size > MAX_PHOTO_BYTES) throw Error('Invalid photo');
    const path = crypto.randomUUID() + '.' + PHOTO_TYPES[blob.type];
    uploaded.push({ bucket: 'product-images', path });
    const { error } = await client.storage.from('product-images').upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) throw Error('Photo upload failed');
    paths.push(path);
  }
  return paths;
}
export async function uploadModel(item: ModelItem | null, uploaded: Uploaded[]): Promise<{ path: string | null; bytes: number | null }> {
  if (!item) return { path: null, bytes: null };
  if (item.kind === 'saved' && item.path) return { path: item.path, bytes: item.bytes };
  const blob = await validatedModel(item);
  const path = crypto.randomUUID() + '.glb';
  uploaded.push({ bucket: 'product-models', path });
  const { error } = await createClient().storage.from('product-models').upload(path, blob, { contentType: MODEL_TYPE, upsert: false });
  if (error) throw Error('Model upload failed');
  return { path, bytes: blob.size };
}
export async function discardUploads(uploaded: Uploaded[]) {
  try {
    const client = createClient();
    const results = await Promise.allSettled(['product-images', 'product-models'].map(async (bucket) => {
      const paths = uploaded.filter((item) => item.bucket === bucket).map((item) => item.path);
      if (!paths.length) return true;
      const { error } = await client.storage.from(bucket).remove(paths);
      return !error;
    }));
    return results.every((result) => result.status === 'fulfilled' && result.value);
  } catch { return false; }
}
