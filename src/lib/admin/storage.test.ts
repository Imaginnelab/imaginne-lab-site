import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import { inspectFiles } from './storage';

// Storage is simulated: these tests only check what inspectFiles makes of its answers.
const answer = (status: number, type: string, bytes: number | string) => new Response(null, { status, headers: { 'content-type': type, 'content-length': String(bytes) } });
const asked: { url: string; method: string; range?: string }[] = [];
type Reply = (url: string, range?: string) => Response | Promise<Response>;
function storage(reply: Reply) {
  asked.length = 0;
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const range = (init.headers as Record<string, string> | undefined)?.range;
    asked.push({ url, method: String(init.method ?? 'GET'), range });
    return reply(url, range);
  });
}
afterEach(() => vi.unstubAllGlobals());

// A GLB: 12-byte header, the JSON chunk, then a binary chunk of padding.
function glb(json: unknown, { text, padding = 64, magic = 0x46546c67, version = 2, declared }: { text?: string; padding?: number; magic?: number; version?: number; declared?: number } = {}) {
  let body = new TextEncoder().encode(text ?? JSON.stringify(json));
  if (body.byteLength % 4) body = new Uint8Array([...body, ...new Array(4 - (body.byteLength % 4)).fill(0x20)]);
  const bytes = new Uint8Array(12 + 8 + body.byteLength + 8 + padding);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, magic, true); view.setUint32(4, version, true); view.setUint32(8, declared ?? bytes.byteLength, true);
  view.setUint32(12, body.byteLength, true); view.setUint32(16, 0x4e4f534a, true);
  bytes.set(body, 20);
  view.setUint32(20 + body.byteLength, padding, true); view.setUint32(24 + body.byteLength, 0x004e4942, true);
  return bytes;
}
// Storage holding one photo type for every image and `file` as every model.
const holding = (file: Uint8Array, { ranges = true } = {}): Reply => (url, range) => {
  if (!url.includes('/product-models/')) return answer(200, 'image/webp', 64350);
  if (!range) return answer(200, 'model/gltf-binary', file.byteLength);
  if (!ranges) return new Response(file.slice(), { status: 200, headers: { 'content-length': String(file.byteLength) } });
  const [from, to] = range.replace('bytes=', '').split('-').map(Number);
  const part = file.slice(from, to + 1);
  return new Response(part, { status: 206, headers: { 'content-length': String(part.byteLength) } });
};
const scene = { asset: { version: '2.0' }, buffers: [{ byteLength: 64 }], images: [{ bufferView: 0, mimeType: 'image/webp' }] };

test('existing photos and model pass, and the model size comes from storage', async () => {
  const file = glb(scene);
  storage(holding(file));
  assert.deepEqual(await inspectFiles(['capa.webp', 'dir/extra 1.png'], 'leao.glb'), { modelBytes: file.byteLength });
  assert.deepEqual(asked.map((request) => request.method), ['HEAD', 'HEAD', 'HEAD', 'GET', 'GET']);
  // Only the project's own public buckets are ever asked.
  assert.ok(asked.every((request) => /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/product-(images|models)\/[^?]+\?check=[0-9a-f-]{36}$/.test(request.url)));
  assert.ok(asked[1].url.split('?')[0].endsWith('/product-images/dir/extra%201.png'));
  // Of the model, only its header and its JSON chunk are downloaded.
  const jsonBytes = new DataView(file.buffer).getUint32(12, true);
  assert.deepEqual(asked.slice(3).map((request) => request.range), ['bytes=0-19', `bytes=20-${19 + jsonBytes}`]);
  assert.deepEqual(await inspectFiles(['capa.webp'], null), { modelBytes: null });
});

test('missing, mistyped, empty or oversized files are refused', async () => {
  const refused = async (reply: Reply, model: string | null = null) => {
    storage(reply);
    return inspectFiles(['capa.webp'], model);
  };
  assert.equal(await refused(() => answer(404, 'application/json', 20)), false);
  assert.equal(await refused(() => answer(200, 'text/html', 500)), false);
  assert.equal(await refused(() => answer(200, 'image/svg+xml', 500)), false);
  assert.equal(await refused(() => answer(200, 'image/png', 0)), false);
  assert.equal(await refused(() => answer(200, 'image/png', 5 * 1024 * 1024 + 1)), false);
  assert.equal(await refused(() => answer(200, 'image/png', 'abc')), false);
  assert.equal(await refused(() => { throw new TypeError('network'); }), false);
  assert.deepEqual(await refused(() => answer(200, 'image/png', 5 * 1024 * 1024)), { modelBytes: null });
  const model = (type: string, bytes: number) => (url: string) => (url.includes('/product-models/') ? answer(200, type, bytes) : answer(200, 'image/png', 10));
  assert.equal(await refused(model('application/octet-stream', 100), 'm.glb'), false);
  assert.equal(await refused(model('model/gltf-binary', 15 * 1024 * 1024 + 1), 'm.glb'), false);
  // A model path that is not a .glb never becomes a request at all.
  assert.equal(await refused(model('model/gltf-binary', 100), 'm.png'), false);
  assert.equal(asked.some((request) => request.url.includes('m.png')), false);
});

test('a model that reaches outside its own file is refused (SEC-002)', async () => {
  const check = async (file: Uint8Array, options?: { ranges: boolean }) => {
    storage(holding(file, options));
    return inspectFiles(['capa.webp'], 'm.glb');
  };
  // Embedded resources: no uri at all, or a data: URI.
  assert.deepEqual(await check(glb(scene)), { modelBytes: glb(scene).byteLength });
  assert.ok(await check(glb({ asset: { version: '2.0' } })));
  assert.ok(await check(glb({ ...scene, images: [{ uri: 'data:image/png;base64,AAAA' }], buffers: [{ uri: 'DATA:application/octet-stream;base64,AAAA', byteLength: 3 }] })));
  for (const uri of ['https://evil.example/t.png', 'http://169.254.169.254/latest', '//evil.example/t.png', 'textures/t.png', '../t.png', 'file:///etc/passwd', 'javascript:alert(1)', '', 7, null]) {
    assert.equal(await check(glb({ ...scene, images: [{ uri }] })), false, `image ${String(uri)}`);
    assert.equal(await check(glb({ ...scene, buffers: [{ uri, byteLength: 4 }] })), false, `buffer ${String(uri)}`);
  }
  assert.equal(await check(glb({ ...scene, images: { uri: 'x' } })), false);
  assert.equal(await check(glb({ ...scene, buffers: ['x'] })), false);
  // Not a glTF 2.0 binary of the size Storage reports.
  assert.equal(await check(glb(scene, { magic: 0x21212121 })), false);
  assert.equal(await check(glb(scene, { version: 1 })), false);
  assert.equal(await check(glb(scene, { declared: 99 })), false);
  assert.equal(await check(glb({ asset: { version: '1.0' } })), false);
  assert.equal(await check(glb(null, { text: '{"asset":{"version":"2.0"},' })), false);
  assert.equal(await check(glb(null, { text: '[]' })), false);
  assert.equal(await check(new Uint8Array(24)), false);
  // A server that ignores the range is not read to the end: the model is refused.
  assert.equal(await check(glb(scene), { ranges: false }), false);
});
