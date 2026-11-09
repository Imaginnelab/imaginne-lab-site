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
const checkoutSessions = new Map();
const checkoutAttempts = new Map();
const checkoutItems = new Map();
const image = await readFile(new URL('../../public/assets/img/hero-vase.jpg', import.meta.url));
const user = { id: '20000000-0000-4000-8000-000000000001', email: 'admin@isolated.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const readBody = async (request) => { let body = ''; for await (const chunk of request) body += chunk; return JSON.parse(body); };
createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4312');
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:4311');
  response.setHeader('Access-Control-Allow-Headers', 'apikey, authorization, content-type, x-client-info, x-supabase-api-version');
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PATCH, OPTIONS');
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
  let currentUserId = user.id;
  try { if (request.headers.authorization?.endsWith('.isolated')) currentUserId = JSON.parse(Buffer.from(request.headers.authorization.slice(7).split('.')[1], 'base64url').toString()).sub; } catch { /* Synthetic auth only. */ }
  // Synthetic Stripe endpoints. This server never forwards requests to Stripe or Supabase.
  if (request.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
    let raw = ''; for await (const chunk of request) raw += chunk;
    const form = new URLSearchParams(raw);
    const idempotency = request.headers['idempotency-key'];
    const previous = checkoutAttempts.get(idempotency);
    if (previous) { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(previous)); return; }
    const id = 'cs_test_isolated' + (checkoutSessions.size + 1);
    let subtotal = 0;
    const items = [];
    for (let i = 0; form.has(`line_items[${i}][quantity]`); i++) {
      const quantity = Number(form.get(`line_items[${i}][quantity]`)), unitAmount = Number(form.get(`line_items[${i}][price_data][unit_amount]`));
      subtotal += quantity * unitAmount;
      items.push({ id: 'li_' + id + i, object: 'item', quantity, description: form.get(`line_items[${i}][price_data][product_data][name]`),
        amount_total: quantity * unitAmount, price: { unit_amount: unitAmount, product: { id: 'prod_' + id + i, object: 'product',
          images: [], metadata: { product_id: form.get(`line_items[${i}][price_data][product_data][metadata][product_id]`),
            product_image: form.get(`line_items[${i}][price_data][product_data][metadata][product_image]`) } } } });
    }
    checkoutItems.set(id, items);
    const shipping = Number(form.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'));
    const tax = form.get('automatic_tax[enabled]') === 'true' ? Math.round((subtotal + shipping) * .13) : 0;
    const session = { id, object: 'checkout.session', livemode: false, mode: 'payment', status: 'open', payment_status: 'unpaid', currency: 'cad',
      // Backdated sessions are only available to this isolated test fixture.
      created: request.headers['x-fixture-created'] ? Number(request.headers['x-fixture-created']) : Math.floor(Date.now() / 1000), customer_details: { email: form.get('customer_email') },
      client_reference_id: form.get('client_reference_id'), metadata: Object.fromEntries([...form.entries()].filter(([key]) => /^metadata\[/.test(key)).map(([key, value]) => [key.slice(9, -1), value])),
      amount_subtotal: subtotal, amount_total: subtotal + shipping + tax, total_details: { amount_tax: tax, amount_shipping: shipping, amount_discount: 0 },
      collected_information: { shipping_details: { name: 'Cliente Teste', address: { line1: '123 Test Street', line2: '', city: 'Vancouver', state: 'BC', postal_code: 'V6B1A1', country: 'CA' } } },
      url: `http://localhost:4312/checkout/${id}`, success_url: form.get('success_url').replace('{CHECKOUT_SESSION_ID}', id), cancel_url: form.get('cancel_url') };
    checkoutSessions.set(id, session); checkoutAttempts.set(idempotency, session);
    response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(session)); return;
  }
  if (url.pathname === '/v1/checkout/sessions' && request.method === 'GET') {
    let sessions = [...checkoutSessions.values()].reverse().sort((a, b) => b.created - a.created);
    if (url.searchParams.has('status')) sessions = sessions.filter((session) => session.status === url.searchParams.get('status'));
    if (url.searchParams.has('customer_details[email]')) sessions = sessions.filter((session) => session.customer_details.email === url.searchParams.get('customer_details[email]'));
    if (url.searchParams.has('created[gte]')) sessions = sessions.filter((session) => session.created >= Number(url.searchParams.get('created[gte]')));
    if (url.searchParams.has('created[lt]')) sessions = sessions.filter((session) => session.created < Number(url.searchParams.get('created[lt]')));
    const cursor = url.searchParams.get('starting_after');
    if (cursor) sessions = sessions.slice(sessions.findIndex((session) => session.id === cursor) + 1);
    const limit = Number(url.searchParams.get('limit') ?? 10);
    response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ object: 'list', data: sessions.slice(0, limit), has_more: sessions.length > limit })); return;
  }
  if (url.pathname.startsWith('/checkout/')) {
    const [, , id, action] = url.pathname.split('/');
    const session = checkoutSessions.get(id);
    if (!session) { response.writeHead(404); response.end(); return; }
    if (['complete', 'pending', 'cancel'].includes(action)) {
      if (action !== 'cancel') { session.status = 'complete'; session.payment_status = action === 'complete' ? 'paid' : 'unpaid'; }
      response.writeHead(303, { Location: action === 'cancel' ? session.cancel_url : session.success_url }); response.end(); return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`<html><head><title>Isolated Stripe test</title></head><body><h1>Simulated Stripe Checkout</h1><p>CAD ${(session.amount_total / 100).toFixed(2)}</p>
      <form action="/checkout/${id}/complete"><button>Complete test payment</button></form>
      <form action="/checkout/${id}/pending"><button>Simulate delayed payment</button></form>
      <a href="/checkout/${id}/cancel">Cancel test payment</a></body></html>`); return;
  }
  if (url.pathname.startsWith('/v1/checkout/sessions/')) {
    const id = url.pathname.split('/')[4];
    const session = checkoutSessions.get(id);
    if (session && url.pathname.endsWith('/line_items')) {
      const items = checkoutItems.get(id) ?? [];
      const limit = Number(url.searchParams.get('limit') ?? 10);
      response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ object: 'list', data: items.slice(0, limit), has_more: items.length > limit })); return;
    }
    if (session && request.method === 'POST') {
      let raw = ''; for await (const chunk of request) raw += chunk;
      for (const [key, value] of new URLSearchParams(raw)) if (/^metadata\[/.test(key)) {
        if (value) session.metadata[key.slice(9, -1)] = value; else delete session.metadata[key.slice(9, -1)];
      }
    }
    response.writeHead(session ? 200 : 404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(session ?? { error: { type: 'invalid_request_error', message: 'No such test session' } })); return;
  }
  if (url.pathname === '/v1/tax/settings') {
    response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ status: 'active' })); return;
  }
  if (url.pathname === '/v1/tax/registrations') {
    response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ object: 'list', data: [{ country: 'CA', status: 'active' }], has_more: false })); return;
  }
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
  else if (url.pathname === '/auth/v1/user') data = { ...user, id: currentUserId, email: currentUserId === user.id ? user.email : 'customer-' + currentUserId.slice(-1) + '@isolated.test' };
  else if (url.pathname === '/rest/v1/users') data = { full_name: currentUserId === user.id ? 'Isolated Admin' : 'Cliente Teste', is_admin: currentUserId === user.id };
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
