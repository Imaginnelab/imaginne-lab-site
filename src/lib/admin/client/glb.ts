export const MODEL_TYPE = 'model/gltf-binary';
export const MAX_MODEL_BYTES = 15 * 1024 * 1024;
export type GlbInfo = { ok: false; external?: boolean } | {
  ok: true; bytes: number; meshes: number; materials: number; textures: number;
  images: number; animations: number; skins: number; morphTargets: boolean;
  extensionsUsed: string[]; extensionsRequired: string[];
};
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
// SEC-002: URI resources must be embedded. Relative, protocol-relative, HTTP,
// file and every other external URI are rejected before optimization or preview.
export function inspectGlb(bytes: Uint8Array): GlbInfo {
  const bad: GlbInfo = { ok: false };
  try {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength < 20 || bytes.byteLength > MAX_MODEL_BYTES) return bad;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength) return bad;
    let offset = 12;
    let json: Record<string, unknown> | null = null;
    let binary = false;
    while (offset < bytes.byteLength) {
      if (offset + 8 > bytes.byteLength) return bad;
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      if (length % 4 || offset + 8 + length > bytes.byteLength) return bad;
      if (offset === 12) {
        if (type !== 0x4e4f534a || !length || length > 4 * 1024 * 1024) return bad;
        const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset + 8, offset + 8 + length)));
        if (!record(parsed) || !record(parsed.asset) || parsed.asset.version !== '2.0') return bad;
        json = parsed;
      } else if (type === 0x4e4f534a) return bad;
      else if (type === 0x004e4942) { if (binary) return bad; binary = true; }
      offset += 8 + length;
    }
    if (!json) return bad;
    const data = json;
    for (const kind of ['buffers', 'images']) {
      const resources = json[kind];
      if (resources !== undefined && !Array.isArray(resources)) return bad;
      for (const resource of Array.isArray(resources) ? resources : []) {
        if (!record(resource)) return bad;
        if ('uri' in resource && (typeof resource.uri !== 'string' || !/^data:/i.test(resource.uri))) return { ok: false, external: true };
      }
    }
    const count = (key: string) => Array.isArray(data[key]) ? data[key].length : 0;
    const list = (key: string): string[] => Array.isArray(data[key]) ? data[key].filter((item: unknown): item is string => typeof item === 'string') : [];
    const meshes: unknown[] = Array.isArray(data.meshes) ? data.meshes : [];
    return {
      ok: true, bytes: bytes.byteLength, meshes: count('meshes'), materials: count('materials'),
      textures: count('textures'), images: count('images'), animations: count('animations'), skins: count('skins'),
      morphTargets: meshes.some((mesh) => record(mesh) && Array.isArray(mesh.primitives) &&
        mesh.primitives.some((primitive: unknown) => record(primitive) && Array.isArray(primitive.targets) && primitive.targets.length > 0)),
      extensionsUsed: list('extensionsUsed'), extensionsRequired: list('extensionsRequired'),
    };
  } catch { return bad; }
}
