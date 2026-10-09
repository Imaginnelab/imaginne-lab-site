// Shrinks a GLB in the administrator's browser before it is uploaded. Loaded only when a 3D
// model is picked in /admin/ (dynamic import); nothing here ever runs on the public site.
//
// What it does: re-encodes textures as WebP (resized to a maximum side), removes unused and
// duplicated data, and quantizes vertex attributes (KHR_mesh_quantization). It deliberately
// does not use Draco or Meshopt: those would need an extra decoder on the public pages.
import { fitWithin } from './product-format.js';

// glTF-Transform does the reading, writing and geometry work. Fixed versions, like the Supabase
// SDK import in auth.js; the three packages must share one copy of the core.
const VERSION = '4.5.1';
const CORE = `https://esm.sh/@gltf-transform/core@${VERSION}`;
const EXTENSIONS = `https://esm.sh/@gltf-transform/extensions@${VERSION}?deps=@gltf-transform/core@${VERSION}`;
const FUNCTIONS = `https://esm.sh/@gltf-transform/functions@${VERSION}?deps=@gltf-transform/core@${VERSION},@gltf-transform/extensions@${VERSION}`;

export const MODEL_TYPE = 'model/gltf-binary';
export const MAX_MODEL_BYTES = 15 * 1024 * 1024;
// Above this the public pages take noticeably longer to open the model on a phone.
export const HEAVY_MODEL_BYTES = 5 * 1024 * 1024;
export const TEXTURE_SIZES = [2048, 1024];
export const OPTIMIZE_TIMEOUT_MS = 20000;
// Limits that keep a hostile or broken file from freezing the tab.
const MAX_TEXTURES = 32;
const MAX_TEXTURE_SIDE = 8192;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const QUALITY = 0.85;
// Normal maps show compression artefacts as lighting errors, so they get a gentler setting.
const NORMAL_QUALITY = 0.92;
const RASTER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Extensions whose data this pipeline cannot read without an external decoder.
const NEEDS_DECODER = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'];

// ---- Pure logic (covered by tests/model-optimize.test.mjs) --------------------------------

const GLB_MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK = 0x4e4f534a; // "JSON"

// Reads only the envelope of a GLB: header and JSON chunk. Returns { ok: false } for anything
// that is not a well-formed glTF 2.0 binary, otherwise the counts used to compare two files.
export function inspectGlb(bytes) {
  const bad = { ok: false };
  try {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength < 20) return bad;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) return bad;
    const total = view.getUint32(8, true);
    if (total !== bytes.byteLength) return bad;
    const jsonLength = view.getUint32(12, true);
    if (view.getUint32(16, true) !== JSON_CHUNK || jsonLength === 0 || jsonLength > MAX_JSON_BYTES || 20 + jsonLength > total) return bad;
    const json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(20, 20 + jsonLength)));
    if (!json || typeof json !== 'object' || Array.isArray(json) || !json.asset || typeof json.asset !== 'object') return bad;
    const count = (key) => (Array.isArray(json[key]) ? json[key].length : 0);
    const list = (key) => (Array.isArray(json[key]) ? json[key].filter((name) => typeof name === 'string') : []);
    const meshes = Array.isArray(json.meshes) ? json.meshes : [];
    return {
      ok: true,
      bytes: total,
      meshes: count('meshes'),
      materials: count('materials'),
      textures: count('textures'),
      images: count('images'),
      animations: count('animations'),
      skins: count('skins'),
      morphTargets: meshes.some((mesh) => Array.isArray(mesh?.primitives) && mesh.primitives.some((primitive) => Array.isArray(primitive?.targets) && primitive.targets.length > 0)),
      extensionsUsed: list('extensionsUsed'),
      extensionsRequired: list('extensionsRequired'),
    };
  } catch { return bad; }
}

// Whether a file is worth handing to the optimiser at all.
export function canOptimize(info) {
  if (!info?.ok || info.bytes > MAX_MODEL_BYTES || info.images > MAX_TEXTURES) return false;
  return !info.extensionsUsed.some((name) => NEEDS_DECODER.includes(name));
}

// Quantization rewrites vertex data. It is skipped for anything that moves or deforms
// (animations, skins, morph targets, GPU instancing), where a precision change could show.
export function canQuantize(info) {
  return !!info?.ok && info.animations === 0 && info.skins === 0 && !info.morphTargets
    && !info.extensionsUsed.includes('EXT_mesh_gpu_instancing');
}

// The optimised file replaces the original only if it is still a valid GLB showing the same
// things (same number of meshes and materials) and is really smaller.
export function acceptOptimized(original, optimized) {
  return !!original?.ok && !!optimized?.ok
    && optimized.meshes === original.meshes && optimized.materials === original.materials
    && optimized.bytes > 0 && optimized.bytes < original.bytes;
}

// Size to store a texture at: never enlarged, longest side at most `max`.
// Returns null for images that are missing, empty or too large to decode safely.
export function textureSize(width, height, max) {
  if (!(width > 0) || !(height > 0) || width > MAX_TEXTURE_SIDE || height > MAX_TEXTURE_SIDE) return null;
  const size = fitWithin(width, height, TEXTURE_SIZES.includes(max) ? max : TEXTURE_SIZES[0]);
  return size.width > 0 && size.height > 0 ? size : null;
}

// WebP quality for a texture, from the material slots that use it.
export function textureQuality(slots) {
  return Array.isArray(slots) && slots.some((slot) => /normal/i.test(String(slot))) ? NORMAL_QUALITY : QUALITY;
}

// ---- Browser pipeline ---------------------------------------------------------------------

let libraries;
function loadLibraries() {
  libraries ||= Promise.all([import(CORE), import(EXTENSIONS), import(FUNCTIONS)])
    .then(([core, extensions, functions]) => ({ core, extensions, functions }))
    .catch((error) => { libraries = null; throw error; });
  return libraries;
}

// Re-encodes one texture image. Returns the new bytes, or null to keep the image as it is.
async function encodeTexture(image, mimeType, max, quality) {
  // No colour management and no premultiplication: these are data as much as pictures.
  const bitmap = await createImageBitmap(new Blob([image], { type: mimeType }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const size = textureSize(bitmap.width, bitmap.height, max);
  if (!size) { bitmap.close?.(); return null; }
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob || blob.type !== 'image/webp' || blob.size >= image.byteLength) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

async function run(bytes, info, maxTexture) {
  const { core, extensions, functions } = await loadLibraries();
  const io = new core.WebIO().registerExtensions(extensions.ALL_EXTENSIONS);
  const document = await io.readBinary(bytes);
  document.setLogger(new core.Logger(core.Logger.Verbosity.SILENT));

  let reencoded = 0;
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage();
    const mimeType = texture.getMimeType();
    if (!image || !RASTER_TYPES.includes(mimeType)) continue;
    const next = await encodeTexture(image, mimeType, maxTexture, textureQuality(functions.listTextureSlots(texture)));
    if (!next) continue;
    texture.setImage(next).setMimeType('image/webp');
    reencoded += 1;
  }
  // Without a fallback image, a viewer has to understand WebP textures to show the model.
  if (reencoded) document.createExtension(extensions.EXTTextureWebP).setRequired(true);

  const steps = [functions.dedup(), functions.prune()];
  if (canQuantize(info)) steps.push(functions.weld(), functions.quantize());
  steps.push(functions.prune());
  await document.transform(...steps);
  return io.writeBinary(document);
}

// Returns { blob, original, optimized } when a smaller, still valid GLB was produced, or null
// to tell the caller to upload the file as it is. Never throws: an optimiser that is slow,
// unreachable or wrong must not stand between the administrator and saving a product.
export async function optimizeModel(file, { maxTexture = TEXTURE_SIZES[0], timeoutMs = OPTIMIZE_TIMEOUT_MS } = {}) {
  let timer;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const original = inspectGlb(bytes);
    if (!canOptimize(original)) return null;
    const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); });
    const output = await Promise.race([run(bytes, original, maxTexture).catch(() => null), timeout]);
    if (!(output instanceof Uint8Array)) return null;
    const optimized = inspectGlb(output);
    if (!acceptOptimized(original, optimized)) return null;
    return { blob: new Blob([output], { type: MODEL_TYPE }), original, optimized };
  } catch { return null; } finally { clearTimeout(timer); }
}
