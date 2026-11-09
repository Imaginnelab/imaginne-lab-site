import { expect, test, type BrowserContext, type APIRequestContext } from '@playwright/test';

const adminId = '20000000-0000-4000-8000-000000000001';
const customerId = '20000000-0000-4000-8000-000000000002';
const otherId = '20000000-0000-4000-8000-000000000003';

async function signInLocally(context: BrowserContext, id = customerId) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const email = id === adminId ? 'admin@isolated.test' : 'customer-' + id.slice(-1) + '@isolated.test';
  const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', exp, iat: exp - 3600 })).toString('base64url'), 'isolated'].join('.');
  const session = { access_token: jwt, refresh_token: 'isolated-refresh', expires_in: 3600, expires_at: exp, token_type: 'bearer',
    user: { id, email, aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {} } };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
}

async function createOrder(request: APIRequestContext, owner = customerId, pending = false, options: { createdAt?: string; status?: string } = {}) {
  const name = 'Peça exclusiva ' + crypto.randomUUID().slice(0, 8);
  const response = await request.post('http://127.0.0.1:4312/v1/checkout/sessions', { headers: { 'Idempotency-Key': crypto.randomUUID(),
    ...(options.createdAt ? { 'X-Fixture-Created': String(Date.parse(options.createdAt) / 1000) } : {}) }, form: {
    mode: 'payment', client_reference_id: owner, customer_email: owner === adminId ? 'admin@isolated.test' : 'customer-' + owner.slice(-1) + '@isolated.test',
    'metadata[source]': 'imaginne-lab-test', 'metadata[order_preview]': name, 'metadata[order_quantity]': '2',
    ...(options.status ? { 'metadata[order_status]': options.status } : {}),
    'metadata[order_image]': 'http://127.0.0.1:4312/storage/v1/object/public/product-images/vase.jpg',
    'line_items[0][quantity]': '2', 'line_items[0][price_data][unit_amount]': '4990', 'line_items[0][price_data][product_data][name]': name,
    'line_items[0][price_data][product_data][metadata][product_id]': '10000000-0000-4000-8000-000000000001',
    'line_items[0][price_data][product_data][metadata][product_image]': 'http://127.0.0.1:4312/storage/v1/object/public/product-images/vase.jpg',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': '500',
    success_url: 'http://localhost:4311/pt/checkout/result/?session_id={CHECKOUT_SESSION_ID}', cancel_url: 'http://localhost:4311/pt/checkout/?canceled=1',
  } });
  expect(response.ok()).toBe(true);
  const session = await response.json();
  await request.get('http://127.0.0.1:4312/checkout/' + session.id + '/' + (pending ? 'pending' : 'complete'), { maxRedirects: 0 });
  return { id: session.id as string, name };
}

test('customer opens order history from the account menu and sees original purchase details', async ({ page, context, request }) => {
  const order = await createOrder(request);
  await signInLocally(context);
  await page.goto('/pt/products/');
  await page.locator('header.nav [data-auth-open]').click();
  await page.getByRole('menuitem', { name: 'Minhas compras', exact: true }).click();
  await expect(page).toHaveURL(/\/pt\/orders\/$/);
  const card = page.locator('.order-card').filter({ hasText: order.name });
  await expect(card).toContainText('Pagamento confirmado');
  await card.getByRole('link', { name: 'Ver detalhes do pedido' }).click();
  await expect(page).toHaveURL(new RegExp('/orders/' + order.id + '/$'));
  await expect(page.locator('.order-items')).toContainText(order.name);
  await expect(page.locator('.order-items')).toContainText('Quantidade: 2');
  await expect(page.locator('.order-address')).toContainText('123 Test Street');
  await expect(page.locator('.order-total')).toContainText('104,80');
});

test('another customer cannot list or open a private order, or access the admin page', async ({ page, context, request }) => {
  const order = await createOrder(request);
  await signInLocally(context, otherId);
  await page.goto('/pt/orders/');
  await expect(page.locator('body')).not.toContainText(order.name);
  const response = await page.goto('/pt/orders/' + order.id + '/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText('123 Test Street');
  await page.goto('/pt/admin/orders/' + order.id + '/');
  await expect(page).toHaveURL(/\/pt\/$/);
  await expect(page.locator('body')).not.toContainText(order.name);
});

test('administrator advances an order and the customer sees shipment tracking and delivery estimate', async ({ page, context, request, browser }) => {
  const order = await createOrder(request);
  await signInLocally(context, adminId);
  await page.goto('/pt/admin/orders/' + order.id + '/');
  await page.getByRole('combobox', { name: 'Status do pedido', exact: true }).selectOption('in_production');
  await page.getByRole('button', { name: 'Salvar atualização', exact: true }).click();
  await expect(page.locator('.order-progress h2')).toHaveText('Em produção');
  await page.getByRole('combobox', { name: 'Status do pedido', exact: true }).selectOption('shipped');
  await page.getByLabel('Código de rastreio da Canada Post (opcional)').fill('1234 5678 9012');
  await page.getByLabel('Previsão de entrega (opcional)').fill('2026-12-10');
  await page.getByRole('button', { name: 'Salvar atualização', exact: true }).click();
  await expect(page.locator('.order-progress h2')).toHaveText('Enviado');
  const customer = await browser.newContext({ baseURL: 'http://localhost:4311' });
  await signInLocally(customer);
  const customerPage = await customer.newPage();
  await customerPage.goto('/pt/orders/' + order.id + '/');
  await expect(customerPage.locator('.order-progress h2')).toHaveText('Enviado');
  await expect(customerPage.locator('.order-progress')).toContainText('123456789012');
  await expect(customerPage.getByRole('link', { name: 'Rastrear na Canada Post' })).toHaveAttribute('href', /canadapost-postescanada\.ca\/track-reperage/);
  await expect(customerPage.locator('.order-progress')).toContainText('Previsão de entrega:');
  await customer.close();
});

test('pending payment never appears confirmed and cannot be advanced by the admin editor', async ({ page, context, request }) => {
  const order = await createOrder(request, customerId, true);
  await signInLocally(context, adminId);
  await page.goto('/pt/admin/orders/' + order.id + '/');
  await expect(page.locator('.order-progress h2')).toHaveText('Aguardando pagamento');
  await expect(page.getByRole('button', { name: 'Salvar atualização' })).toHaveCount(0);
});

test('visitors are asked to sign in without seeing customer data', async ({ page, request }) => {
  const order = await createOrder(request);
  await page.goto('/pt/orders/');
  await expect(page.locator('.order-empty')).toContainText('Entre na sua conta');
  await page.goto('/pt/orders/' + order.id + '/');
  await expect(page.locator('.order-empty')).toContainText('Entre na sua conta');
  await expect(page.locator('body')).not.toContainText(order.name);
});

test('order history and timeline fit mobile, dark theme, and all three languages', async ({ page, context, request }) => {
  const order = await createOrder(request);
  await signInLocally(context);
  await page.addInitScript(() => localStorage.setItem('imaginne-theme', 'dark'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pt/orders/' + order.id + '/');
  await expect(page.locator('.order-items')).toContainText(order.name);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Orders are reached from the account menu, not a header button.
  await expect(page.locator('header.nav').getByRole('link', { name: 'Meus pedidos', exact: true })).toHaveCount(0);
  await page.locator('header.nav [data-auth-open]').click();
  await expect(page.getByRole('menuitem', { name: 'Minhas compras', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/order-details-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/pt/orders/');
  await expect(page.locator('.order-card').filter({ hasText: order.name })).toBeVisible();
  await page.screenshot({ path: 'test-results/orders-desktop.png', fullPage: true });
  await page.goto('/orders/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your orders');
  await page.goto('/es/orders/' + order.id + '/');
  await expect(page.locator('.order-progress h2')).toHaveText('Pago confirmado');
});

test('admin combines status and inclusive creation dates, then clears the filters', async ({ page, context, request }) => {
  const start = await createOrder(request, customerId, false, { createdAt: '2026-01-15T03:00:00Z', status: 'shipped' });
  const end = await createOrder(request, customerId, false, { createdAt: '2026-01-16T02:59:59Z', status: 'shipped' });
  const nextDay = await createOrder(request, customerId, false, { createdAt: '2026-01-16T03:00:00Z', status: 'shipped' });
  const previousDay = await createOrder(request, customerId, false, { createdAt: '2026-01-15T02:59:59Z', status: 'shipped' });
  const differentStatus = await createOrder(request, customerId, false, { createdAt: '2026-01-15T12:00:00Z' });
  await signInLocally(context, adminId);
  await page.goto('/pt/admin/orders/');
  await page.getByLabel('Status', { exact: true }).selectOption('shipped');
  await page.getByLabel('Criados a partir de').fill('2026-01-15');
  await page.getByLabel('Criados até').fill('2026-01-15');
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await expect(page).toHaveURL(/status=shipped/);
  await expect(page.locator('.order-card').filter({ hasText: start.name })).toBeVisible();
  await expect(page.locator('.order-card').filter({ hasText: end.name })).toBeVisible();
  for (const order of [nextDay, previousDay, differentStatus]) await expect(page.locator('.orders-list')).not.toContainText(order.name);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/admin-order-filters-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Limpar filtros', exact: true }).click();
  await expect(page).toHaveURL(/\/pt\/admin\/orders\/$/);
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('all');
  await expect(page.getByLabel('Criados a partir de')).toHaveValue('');
});

test('admin pagination preserves filters and applying a new status resets the cursor', async ({ page, context, request }) => {
  for (let index = 0; index < 22; index++) await createOrder(request, customerId, false, { createdAt: '2026-02-02T12:00:00Z', status: 'delivered' });
  const confirmed = await createOrder(request, customerId, false, { createdAt: '2026-02-02T12:00:00Z' });
  await signInLocally(context, adminId);
  await page.goto('/pt/admin/orders/?status=delivered&from=2026-02-02&to=2026-02-02');
  await expect(page.locator('.order-card')).toHaveCount(20);
  await page.getByRole('link', { name: 'Pedidos anteriores', exact: true }).click();
  await expect(page).toHaveURL(/status=delivered&from=2026-02-02&to=2026-02-02&after=/);
  await expect(page.locator('.order-card')).toHaveCount(2);
  await page.getByLabel('Status', { exact: true }).selectOption('confirmed');
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await expect(page).not.toHaveURL(/after=/);
  await expect(page.locator('.order-card')).toHaveCount(1);
  await expect(page.locator('.orders-list')).toContainText(confirmed.name);
});

test('invalid and empty admin filters show helpful feedback', async ({ page, context }) => {
  await signInLocally(context, adminId);
  await page.goto('/pt/admin/orders/?from=2026-02-05&to=2026-02-01');
  await expect(page.locator('.order-empty')).toContainText('A data inicial deve ser anterior ou igual');
  await page.goto('/pt/admin/orders/?from=2040-01-01');
  await expect(page.getByRole('heading', { name: 'Nenhum pedido encontrado' })).toBeVisible();
  await page.goto('/es/admin/orders/');
  await expect(page.getByRole('button', { name: 'Aplicar filtros', exact: true })).toBeVisible();
  await expect(page.getByLabel('Creados desde')).toBeVisible();
});
