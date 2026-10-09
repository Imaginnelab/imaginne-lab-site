import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import { inspectFiles } from './storage';

// Storage is simulated: these tests only check what inspectFiles makes of its answers.
const answer = (status: number, type: string, bytes: number | string) => new Response(null, { status, headers: { 'content-type': type, 'content-length': String(bytes) } });
const asked: { url: string; method: string }[] = [];
function storage(reply: (url: string) => Response | Promise<Response>) {
  asked.length = 0;
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => { asked.push({ url, method: String(init.method) }); return reply(url); });
}
afterEach(() => vi.unstubAllGlobals());

test('existing photos and model pass, and the model size comes from storage', async () => {
  storage((url) => (url.includes('/product-models/') ? answer(200, 'model/gltf-binary', 1258868) : answer(200, 'image/webp; charset=binary', 64350)));
  assert.deepEqual(await inspectFiles(['capa.webp', 'dir/extra 1.png'], 'leao.glb'), { modelBytes: 1258868 });
  assert.deepEqual(asked.map((request) => request.method), ['HEAD', 'HEAD', 'HEAD']);
  // Only the project's own public buckets are ever asked.
  assert.ok(asked.every((request) => /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/product-(images|models)\//.test(request.url)));
  assert.ok(asked[1].url.endsWith('/product-images/dir/extra%201.png'));
  assert.deepEqual(await inspectFiles(['capa.webp'], null), { modelBytes: null });
});

test('missing, mistyped, empty or oversized files are refused', async () => {
  const refused = async (reply: (url: string) => Response | Promise<Response>, model: string | null = null) => {
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
  assert.deepEqual(await refused(model('model/gltf-binary', 15 * 1024 * 1024), 'm.glb'), { modelBytes: 15 * 1024 * 1024 });
  // A model path that is not a .glb never becomes a request at all.
  assert.equal(await refused(model('model/gltf-binary', 100), 'm.png'), false);
  assert.equal(asked.some((request) => request.url.includes('m.png')), false);
});
