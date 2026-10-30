import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const product = {
  id: '10000000-0000-4000-8000-000000000001',
  name_en: 'Sculptural vase', name_pt: 'Vaso escultural', name_es: 'Florero escultórico',
  description_en: 'A sculptural piece for your space.\nPrinted layer by layer, with a distinctive finish.',
  description_pt: 'Uma peça escultural para o seu espaço.\nImpressa camada por camada, com acabamento único.',
  description_es: 'Una pieza escultórica para tu espacio.\nImpresa capa por capa, con un acabado único.',
  price_cad_cents: 4990, image_path: 'vase.jpg', extra_image_paths: ['vase-detail.jpg'],
  model_path: 'vase.glb', model_bytes: 1024, view_count: 0, is_active: true, sort_order: 0,
  category_pt: 'Decoração', category_en: 'Home decor', category_es: 'Decoración',
  material_pt: 'PLA', material_en: 'PLA', material_es: 'PLA',
  finish_pt: 'Texturizado', finish_en: 'Textured', finish_es: 'Texturizado',
  care_pt: 'Limpar com pano úmido.', care_en: 'Clean with a damp cloth.', care_es: 'Limpiar con un paño húmedo.',
  colors: [{ id: '30000000-0000-4000-8000-000000000001', name: 'Rosa', hex: '#FFC0CB', locale: 'pt', sort_order: 0 }, { id: '30000000-0000-4000-8000-000000000002', name: 'branco', hex: '#FFFFFF', locale: 'pt', sort_order: 1 },
    { id: '30000000-0000-4000-8000-000000000003', name: 'Pink', hex: '#FFC0CB', locale: 'en', sort_order: 0 }, { id: '30000000-0000-4000-8000-000000000004', name: 'White', hex: '#FFFFFF', locale: 'en', sort_order: 1 },
    { id: '30000000-0000-4000-8000-000000000005', name: 'Rosa', hex: '#FFC0CB', locale: 'es', sort_order: 0 }, { id: '30000000-0000-4000-8000-000000000006', name: 'Blanco', hex: '#FFFFFF', locale: 'es', sort_order: 1 }],
  width_cm: 12.5, height_cm: 20, depth_cm: 12.5, weight_g: 180, stock_quantity: 8,
};
const quote = { ...product, id: '10000000-0000-4000-8000-000000000002', price_cad_cents: null, model_path: null, model_bytes: null,
  name_en: 'Custom vase', name_pt: 'Vaso personalizado', name_es: 'Florero personalizado', extra_image_paths: [], stock_quantity: 0 };
const writes = [];
const image = await readFile(new URL('../../public/assets/img/hero-vase.jpg', import.meta.url));
const user = { id: '20000000-0000-4000-8000-000000000001', email: 'admin@isolated.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const readBody = async (request) => { let body = ''; for await (const chunk of request) body += chunk; return JSON.parse(body); };
createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4312');
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:4311');
  response.setHeader('Access-Control-Allow-Headers', 'apikey, authorization, content-type, x-client-info, x-supabase-api-version');
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PATCH, OPTIONS');
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
  if (request.method === 'POST' && url.pathname === '/rest/v1/rpc/save_product_with_colors' && request.headers.authorization?.endsWith('.isolated')) {
    const body = await readBody(request);
    if (Object.keys(body.p_product).some((key) => key.startsWith('colors'))) {
      response.writeHead(400, { 'Content-Type': 'application/json' }); response.end('{"code":"42703"}'); return;
    }
    writes.push({ ...body.p_product, colors: body.p_colors, product_id: body.p_id });
    response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body.p_id ?? product.id)); return;
  }
  if (request.method === 'PATCH' && url.pathname === '/rest/v1/products' && request.headers.authorization?.endsWith('.isolated')) {
    const body = await readBody(request);
    writes.push(body);
    response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify([{ id: product.id, ...body }])); return;
  }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  if (url.pathname.startsWith('/storage/') && url.pathname.endsWith('.jpg')) {
    response.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': image.length }); response.end(request.method === 'HEAD' ? undefined : image); return;
  }
  let data;
  if (url.pathname === '/health') data = { ok: true };
  else if (url.pathname === '/__writes') data = writes;
  else if (url.pathname === '/auth/v1/user') data = user;
  else if (url.pathname === '/rest/v1/users') data = { full_name: 'Isolated Admin', is_admin: true };
  else if (url.pathname === '/rest/v1/coupons') data = [];
  else if (url.pathname === '/rest/v1/site_settings') data = { maintenance_mode: false };
  else if (url.pathname === '/rest/v1/products') {
    const legacy = url.searchParams.get('id')?.includes('10000000-0000-4000-8000-000000000005');
    if (legacy && url.searchParams.get('select')?.includes('category_pt')) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ code: '42703', message: 'column products.category_pt does not exist' })); return;
    }
    if (url.searchParams.get('id')?.includes('10000000-0000-4000-8000-000000000003')) {
      response.writeHead(503, { 'Content-Type': 'application/json' }); response.end('{"message":"Simulated unavailable backend"}'); return;
    }
    data = [product, quote];
    const ids = url.searchParams.get('id');
    if (ids?.startsWith('in.')) data = data.filter((row) => ids.includes(row.id));
    if (ids?.startsWith('eq.')) data = data.filter((row) => ids.slice(3) === row.id);
    if (legacy) data = [{ id: '10000000-0000-4000-8000-000000000005', name_pt: 'Vaso anterior à migração', name_en: 'Legacy vase', name_es: 'Florero anterior',
      description_pt: product.description_pt, description_en: product.description_en, description_es: product.description_es,
      price_cad_cents: 4990, image_path: 'vase.jpg', extra_image_paths: [], model_path: null, model_bytes: null, view_count: 0 }];
    if (url.searchParams.has('view_count')) data = [];
    response.setHeader('Content-Range', '0-' + Math.max(0, data.length - 1) + '/' + data.length);
    // Single-object queries are used by admin updates.
    if (request.headers.accept?.includes('vnd.pgrst.object')) data = data[0] ?? null;
  } else { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data));
}).listen(4312, '127.0.0.1');
