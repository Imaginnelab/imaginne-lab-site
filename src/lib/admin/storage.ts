import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { imageUrl, modelUrl } from '@/lib/products/format';
import { SUPABASE_URL } from '@/lib/env';
import type { Database } from '@/types/database';
import { MAX_MODEL_BYTES, MAX_PHOTO_BYTES } from './schemas';

// Files of a product live in two public buckets. The browser uploads them straight to Storage
// (photos and models are too large for a Server Action); the server only ever receives paths,
// and checks here that they point at real objects of the right kind before a row may use them.

export const PHOTO_BUCKET = 'product-images';
export const MODEL_BUCKET = 'product-models';

type Client = SupabaseClient<Database>;
type Probe = { ok: boolean; bytes: number };

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MODEL_TYPES = ['model/gltf-binary'];

// Asks Storage about one object through its public address. The host is fixed and the path
// has already passed the schema, so this request cannot be pointed anywhere else.
async function probe(url: string, types: readonly string[], maxBytes: number): Promise<Probe> {
  const missing = { ok: false, bytes: 0 };
  if (!url) return missing;
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) return missing;
    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const bytes = Number(response.headers.get('content-length'));
    if (!types.includes(type) || !Number.isInteger(bytes) || bytes < 1 || bytes > maxBytes) return missing;
    return { ok: true, bytes };
  } catch {
    return missing;
  }
}

// Public files are served through a CDN that may keep answering for an object that was
// already deleted. A query of its own makes every check reach Storage itself.
const fresh = (url: string) => (url ? `${url}?check=${crypto.randomUUID()}` : '');

const MAX_GLB_JSON_BYTES = 4 * 1024 * 1024;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

// One slice of a stored object. Anything but exactly the bytes asked for counts as a failure,
// so a server that ignored the range is never read to the end.
async function slice(url: string, from: number, to: number): Promise<Uint8Array | null> {
  const response = await fetch(url, { headers: { range: `bytes=${from}-${to}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (response.status !== 206 || Number(response.headers.get('content-length')) !== to - from + 1) {
    await response.body?.cancel().catch(() => {});
    return null;
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return bytes.byteLength === to - from + 1 ? bytes : null;
}

// SEC-002 on the server: a model may only use what is inside its own file. A GLB starts with
// a 12-byte header and its JSON chunk, so the header and that chunk are all that is read (a
// few kilobytes, never the whole model): the file must be a glTF 2.0 binary of the size
// Storage reports, and no buffer or image may point at a URI other than embedded `data:`.
// The browser runs the same rule before uploading; this is the check that cannot be skipped.
async function selfContainedModel(url: string, totalBytes: number): Promise<boolean> {
  try {
    const head = await slice(url, 0, 19);
    if (!head) return false;
    const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
    const jsonBytes = view.getUint32(12, true);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== totalBytes) return false;
    if (view.getUint32(16, true) !== 0x4e4f534a || !jsonBytes || jsonBytes % 4 || jsonBytes > MAX_GLB_JSON_BYTES || 20 + jsonBytes > totalBytes) return false;
    const chunk = await slice(url, 20, 19 + jsonBytes);
    if (!chunk) return false;
    const json: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(chunk));
    if (!record(json) || !record(json.asset) || json.asset.version !== '2.0') return false;
    for (const kind of ['buffers', 'images']) {
      const resources = json[kind];
      if (resources === undefined) continue;
      if (!Array.isArray(resources)) return false;
      for (const resource of resources) {
        if (!record(resource)) return false;
        if ('uri' in resource && (typeof resource.uri !== 'string' || !/^data:/i.test(resource.uri))) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// Whether every photo exists, and the real size of the model (null when there is none).
// `false` means at least one file is missing, of the wrong kind, too large, or a model that
// is not a self-contained GLB.
export async function inspectFiles(photos: readonly string[], model: string | null): Promise<{ modelBytes: number | null } | false> {
  const [photoResults, modelResult] = await Promise.all([
    Promise.all(photos.map((path) => probe(fresh(imageUrl(SUPABASE_URL, path)), PHOTO_TYPES, MAX_PHOTO_BYTES))),
    model === null ? null : probe(fresh(modelUrl(SUPABASE_URL, model)), MODEL_TYPES, MAX_MODEL_BYTES),
  ]);
  if (photoResults.some((result) => !result.ok) || (modelResult && !modelResult.ok)) return false;
  if (model !== null && modelResult && !(await selfContainedModel(fresh(modelUrl(SUPABASE_URL, model)), modelResult.bytes))) return false;
  return { modelBytes: modelResult ? modelResult.bytes : null };
}

// Removes files that no product points at any more. Best effort and never thrown: a leftover
// file is harmless, while a failed cleanup must not undo a write that already happened.
// A file still referenced by any product (cover, extra photo or model) is always kept.
export async function removeUnreferenced(supabase: Client, photos: readonly string[], models: readonly string[]): Promise<void> {
  const jobs = [
    ...photos.map((path) => ({ bucket: PHOTO_BUCKET, path })),
    ...models.map((path) => ({ bucket: MODEL_BUCKET, path })),
  ];
  await Promise.all(jobs.map(async ({ bucket, path }) => {
    try {
      const { data, error } = await supabase.from('products').select('id')
        .or(`image_path.eq."${path}",extra_image_paths.cs.{"${path}"},model_path.eq."${path}"`).limit(1);
      if (error || !data || data.length > 0) return;
      await supabase.storage.from(bucket).remove([path]);
    } catch {
      // Left for a later cleanup.
    }
  }));
}
