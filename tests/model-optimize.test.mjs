import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HEAVY_MODEL_BYTES, MAX_MODEL_BYTES, MODEL_TYPE, OPTIMIZE_TIMEOUT_MS, TEXTURE_SIZES,
  acceptOptimized, canOptimize, canQuantize, inspectGlb, optimizeModel, textureQuality, textureSize,
} from '../public/assets/js/model-optimize.js';

// Builds a GLB with the given JSON and an optional binary chunk.
function glb(json, { bin = 0, magic = 'glTF', version = 2, lie = 0, chunk = 'JSON' } = {}) {
  let text = typeof json === 'string' ? json : JSON.stringify(json);
  while (text.length % 4) text += ' ';
  const jsonBytes = new TextEncoder().encode(text);
  const binLength = bin ? Math.ceil(bin / 4) * 4 : 0;
  const total = 12 + 8 + jsonBytes.length + (binLength ? 8 + binLength : 0);
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode(magic), 0);
  view.setUint32(4, version, true);
  view.setUint32(8, total + lie, true);
  view.setUint32(12, jsonBytes.length, true);
  bytes.set(new TextEncoder().encode(chunk), 16);
  bytes.set(jsonBytes, 20);
  if (binLength) {
    view.setUint32(20 + jsonBytes.length, binLength, true);
    bytes.set(new TextEncoder().encode('BIN\0'), 24 + jsonBytes.length);
  }
  return bytes;
}
const scene = (extra = {}) => ({
  asset: { version: '2.0' },
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  materials: [{}, {}],
  textures: [{ source: 0 }],
  images: [{ bufferView: 0, mimeType: 'image/jpeg' }],
  ...extra,
});

test('inspectGlb reads the envelope and counts what the file shows', () => {
  const info = inspectGlb(glb(scene(), { bin: 100 }));
  assert.equal(info.ok, true);
  assert.deepEqual(
    { meshes: info.meshes, materials: info.materials, textures: info.textures, images: info.images, animations: info.animations, skins: info.skins, morphTargets: info.morphTargets },
    { meshes: 1, materials: 2, textures: 1, images: 1, animations: 0, skins: 0, morphTargets: false },
  );
  assert.equal(info.bytes, glb(scene(), { bin: 100 }).byteLength);
  assert.deepEqual(inspectGlb(glb(scene({ extensionsUsed: ['KHR_mesh_quantization', 7], extensionsRequired: ['KHR_mesh_quantization'] }))).extensionsUsed, ['KHR_mesh_quantization']);
  assert.equal(inspectGlb(glb(scene({ meshes: [{ primitives: [{ attributes: {}, targets: [{ POSITION: 1 }] }] }] }))).morphTargets, true);
  // A view into a larger buffer is read correctly too.
  const padded = new Uint8Array(glb(scene()).byteLength + 16);
  padded.set(glb(scene()), 8);
  assert.equal(inspectGlb(padded.subarray(8, padded.byteLength - 8)).ok, true);
});

test('inspectGlb rejects anything that is not a well-formed glTF 2.0 binary', () => {
  const bad = (bytes) => assert.deepEqual(inspectGlb(bytes), { ok: false });
  bad(new Uint8Array(0));
  bad(new Uint8Array(19));
  bad(glb(scene(), { magic: 'glTX' }));
  bad(glb(scene(), { version: 1 }));
  bad(glb(scene(), { lie: 4 }));
  bad(glb(scene(), { lie: -4 }));
  bad(glb(scene(), { chunk: 'BIN\0' }));
  bad(glb('{ not json'));
  bad(glb('[1,2,3]'));
  bad(glb('"text"'));
  bad(glb({ meshes: [] }));
  bad(glb({ asset: 'x' }));
  bad('glTF');
  bad(null);
  bad(new ArrayBuffer(64));
  // A JSON chunk that claims to be longer than the file.
  const cut = glb(scene());
  new DataView(cut.buffer).setUint32(12, cut.byteLength, true);
  bad(cut);
  // Garbage that is not valid UTF-8.
  const garbage = glb(scene());
  garbage.fill(0xff, 20, 28);
  bad(garbage);
});

test('canOptimize skips files that are too big, too busy or need an external decoder', () => {
  const info = inspectGlb(glb(scene()));
  assert.equal(canOptimize(info), true);
  assert.equal(canOptimize({ ...info, bytes: MAX_MODEL_BYTES + 1 }), false);
  assert.equal(canOptimize({ ...info, bytes: MAX_MODEL_BYTES }), true);
  assert.equal(canOptimize({ ...info, images: 33 }), false);
  for (const name of ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu']) {
    assert.equal(canOptimize({ ...info, extensionsUsed: [name] }), false, name);
  }
  assert.equal(canOptimize({ ...info, extensionsUsed: ['KHR_materials_emissive_strength'] }), true);
  assert.equal(canOptimize({ ok: false }), false);
  assert.equal(canOptimize(null), false);
});

test('canQuantize only touches geometry that stays still', () => {
  const info = inspectGlb(glb(scene()));
  assert.equal(canQuantize(info), true);
  assert.equal(canQuantize({ ...info, animations: 1 }), false);
  assert.equal(canQuantize({ ...info, skins: 1 }), false);
  assert.equal(canQuantize({ ...info, morphTargets: true }), false);
  assert.equal(canQuantize({ ...info, extensionsUsed: ['EXT_mesh_gpu_instancing'] }), false);
  assert.equal(canQuantize({ ok: false }), false);
});

test('acceptOptimized needs a valid, equivalent and smaller file', () => {
  const original = { ok: true, bytes: 3950816, meshes: 1, materials: 1 };
  assert.equal(acceptOptimized(original, { ok: true, bytes: 1400000, meshes: 1, materials: 1 }), true);
  assert.equal(acceptOptimized(original, { ok: true, bytes: 3950816, meshes: 1, materials: 1 }), false);
  assert.equal(acceptOptimized(original, { ok: true, bytes: 4000000, meshes: 1, materials: 1 }), false);
  assert.equal(acceptOptimized(original, { ok: true, bytes: 1400000, meshes: 2, materials: 1 }), false);
  assert.equal(acceptOptimized(original, { ok: true, bytes: 1400000, meshes: 1, materials: 0 }), false);
  assert.equal(acceptOptimized(original, { ok: true, bytes: 0, meshes: 1, materials: 1 }), false);
  assert.equal(acceptOptimized(original, { ok: false }), false);
  assert.equal(acceptOptimized({ ok: false }, { ok: true, bytes: 1, meshes: 1, materials: 1 }), false);
  assert.equal(acceptOptimized(original, null), false);
  // End to end with real envelopes: the same scene with a smaller binary chunk.
  assert.equal(acceptOptimized(inspectGlb(glb(scene(), { bin: 4000 })), inspectGlb(glb(scene(), { bin: 1000 }))), true);
  assert.equal(acceptOptimized(inspectGlb(glb(scene(), { bin: 4000 })), inspectGlb(glb(scene({ materials: [{}] }), { bin: 1000 }))), false);
});

test('textureSize caps the longest side, never enlarges and refuses unsafe sizes', () => {
  assert.deepEqual(TEXTURE_SIZES, [2048, 1024]);
  assert.deepEqual(textureSize(4096, 4096, 2048), { width: 2048, height: 2048 });
  assert.deepEqual(textureSize(4096, 2048, 2048), { width: 2048, height: 1024 });
  assert.deepEqual(textureSize(2048, 2048, 2048), { width: 2048, height: 2048 });
  assert.deepEqual(textureSize(2048, 2048, 1024), { width: 1024, height: 1024 });
  assert.deepEqual(textureSize(512, 256, 1024), { width: 512, height: 256 });
  // An option that is not on offer falls back to the default.
  assert.deepEqual(textureSize(4096, 4096, 16), { width: 2048, height: 2048 });
  assert.deepEqual(textureSize(4096, 4096, undefined), { width: 2048, height: 2048 });
  assert.equal(textureSize(8193, 100, 2048), null);
  assert.equal(textureSize(100, 8193, 2048), null);
  assert.equal(textureSize(0, 100, 2048), null);
  assert.equal(textureSize(NaN, 100, 2048), null);
  assert.deepEqual(textureSize(8192, 8192, 2048), { width: 2048, height: 2048 });
});

test('textureQuality is gentler on normal maps', () => {
  assert.equal(textureQuality(['baseColorTexture']), 0.85);
  assert.equal(textureQuality(['metallicRoughnessTexture', 'occlusionTexture']), 0.85);
  assert.equal(textureQuality(['normalTexture']), 0.92);
  assert.equal(textureQuality(['baseColorTexture', 'clearcoatNormalTexture']), 0.92);
  assert.equal(textureQuality([]), 0.85);
  assert.equal(textureQuality(undefined), 0.85);
});

test('optimizeModel hands back null instead of failing', async () => {
  assert.equal(MODEL_TYPE, 'model/gltf-binary');
  assert.equal(OPTIMIZE_TIMEOUT_MS, 20000);
  assert.equal(HEAVY_MODEL_BYTES, 5 * 1024 * 1024);
  // Not a GLB, and a GLB that needs a decoder: both are left alone without loading anything.
  assert.equal(await optimizeModel(new Blob([new Uint8Array(64)])), null);
  assert.equal(await optimizeModel(new Blob([glb(scene({ extensionsUsed: ['KHR_draco_mesh_compression'] }))])), null);
  assert.equal(await optimizeModel({ arrayBuffer: () => Promise.reject(new Error('unreadable')) }), null);
  assert.equal(await optimizeModel(null), null);
});
