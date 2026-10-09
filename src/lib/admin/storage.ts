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

// Whether every photo exists, and the real size of the model (null when there is none).
// `false` means at least one file is missing, of the wrong kind or too large.
export async function inspectFiles(photos: readonly string[], model: string | null): Promise<{ modelBytes: number | null } | false> {
  const [photoResults, modelResult] = await Promise.all([
    Promise.all(photos.map((path) => probe(imageUrl(SUPABASE_URL, path), PHOTO_TYPES, MAX_PHOTO_BYTES))),
    model === null ? null : probe(modelUrl(SUPABASE_URL, model), MODEL_TYPES, MAX_MODEL_BYTES),
  ]);
  if (photoResults.some((result) => !result.ok) || (modelResult && !modelResult.ok)) return false;
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
