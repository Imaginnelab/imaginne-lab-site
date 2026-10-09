// Browser-only port of legacy/public/assets/js/model-optimize.js.
import { fitWithin } from '@/lib/products/format';
import { inspectGlb, MAX_MODEL_BYTES, MODEL_TYPE, type GlbInfo } from './glb';
export { inspectGlb, MAX_MODEL_BYTES, MODEL_TYPE };
export const HEAVY_MODEL_BYTES = 5 * 1024 * 1024;
export const TEXTURE_SIZES = [2048, 1024];
export const OPTIMIZE_TIMEOUT_MS = 20_000;
const MAX_TEXTURES = 32;
const MAX_TEXTURE_SIDE = 8192;
const QUALITY = 0.85;
const NORMAL_QUALITY = 0.92;
const RASTER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const NEEDS_DECODER = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'];
type GoodInfo = Extract<GlbInfo, { ok: true }>;
export function canOptimize(info: GlbInfo): info is GoodInfo {
  return info.ok && info.bytes <= MAX_MODEL_BYTES && info.images <= MAX_TEXTURES &&
    !info.extensionsUsed.some((name) => NEEDS_DECODER.includes(name));
}
export function canQuantize(info: GlbInfo) {
  return info.ok && info.animations === 0 && info.skins === 0 && !info.morphTargets &&
    !info.extensionsUsed.includes('EXT_mesh_gpu_instancing');
}
export function acceptOptimized(original: GlbInfo, optimized: GlbInfo) {
  return original.ok && optimized.ok && optimized.meshes === original.meshes &&
    optimized.materials === original.materials && optimized.bytes > 0 && optimized.bytes < original.bytes;
}
export function textureSize(width: number, height: number, max: number) {
  if (!(width > 0) || !(height > 0) || width > MAX_TEXTURE_SIDE || height > MAX_TEXTURE_SIDE) return null;
  const size = fitWithin(width, height, TEXTURE_SIZES.includes(max) ? max : TEXTURE_SIZES[0]);
  return size.width > 0 && size.height > 0 ? size : null;
}
export function textureQuality(slots: unknown) {
  return Array.isArray(slots) && slots.some((slot) => /normal/i.test(String(slot))) ? NORMAL_QUALITY : QUALITY;
}
interface Texture {
  getImage(): Uint8Array | null; getMimeType(): string;
  setImage(image: Uint8Array): Texture; setMimeType(type: string): Texture;
}
interface GltfDocument {
  setLogger(logger: unknown): void; getRoot(): { listTextures(): Texture[] };
  createExtension(extension: unknown): { setRequired(required: boolean): void };
  transform(...steps: unknown[]): Promise<void>;
}
interface WebIO {
  registerExtensions(extensions: unknown[]): WebIO;
  readBinary(bytes: Uint8Array): Promise<GltfDocument>;
  writeBinary(document: GltfDocument): Promise<Uint8Array>;
}
type Libraries = {
  core: { WebIO: new () => WebIO; Logger: (new (verbosity: unknown) => unknown) & { Verbosity: { SILENT: unknown } } };
  extensions: { ALL_EXTENSIONS: unknown[]; EXTTextureWebP: unknown };
  functions: { listTextureSlots(texture: Texture): unknown; dedup(): unknown; prune(): unknown; weld(): unknown; quantize(): unknown };
};
let libraries: Promise<Libraries> | null = null;
// The three packages are installed from npm (exact versions in package.json) and split into
// their own chunk, fetched only when an administrator picks a model.
function loadLibraries() {
  libraries ??= Promise.all([
    import('@gltf-transform/core'),
    import('@gltf-transform/extensions'),
    import('@gltf-transform/functions'),
  ])
    .then(([core, extensions, functions]) => ({ core, extensions, functions }) as unknown as Libraries)
    .catch((error: unknown) => { libraries = null; throw error; });
  return libraries;
}
async function encodeTexture(image: Uint8Array, mimeType: string, max: number, quality: number) {
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(image).buffer], { type: mimeType }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  let canvas: HTMLCanvasElement | null = null;
  try {
    const size = textureSize(bitmap.width, bitmap.height, max);
    if (!size) return null;
    canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, 'image/webp', quality));
    return blob?.type === 'image/webp' && blob.size < image.byteLength ? new Uint8Array(await blob.arrayBuffer()) : null;
  } finally { bitmap.close(); if (canvas) { canvas.width = 0; canvas.height = 0; } }
}
async function run(bytes: Uint8Array, info: GoodInfo, maxTexture: number) {
  const { core, extensions, functions } = await loadLibraries();
  const io = new core.WebIO().registerExtensions(extensions.ALL_EXTENSIONS);
  const document = await io.readBinary(bytes);
  document.setLogger(new core.Logger(core.Logger.Verbosity.SILENT));
  let reencoded = 0;
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage(), mimeType = texture.getMimeType();
    if (!image || !RASTER_TYPES.includes(mimeType)) continue;
    const next = await encodeTexture(image, mimeType, maxTexture, textureQuality(functions.listTextureSlots(texture)));
    if (next) { texture.setImage(next).setMimeType('image/webp'); reencoded++; }
  }
  if (reencoded) document.createExtension(extensions.EXTTextureWebP).setRequired(true);
  const steps = [functions.dedup(), functions.prune()];
  if (canQuantize(info)) steps.push(functions.weld(), functions.quantize());
  steps.push(functions.prune());
  await document.transform(...steps);
  return io.writeBinary(document);
}
export async function optimizeModel(file: Blob, { maxTexture = TEXTURE_SIZES[0], timeoutMs = OPTIMIZE_TIMEOUT_MS } = {}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const original = inspectGlb(bytes);
    if (!canOptimize(original)) return null; // SEC-002 runs before the remote library.
    const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); });
    const output = await Promise.race([run(bytes, original, maxTexture).catch(() => null), timeout]);
    if (!(output instanceof Uint8Array)) return null;
    const optimized = inspectGlb(output);
    if (!acceptOptimized(original, optimized)) return null;
    return { blob: new Blob([new Uint8Array(output).buffer], { type: MODEL_TYPE }), original, optimized };
  } catch { return null; } finally { clearTimeout(timer); }
}

