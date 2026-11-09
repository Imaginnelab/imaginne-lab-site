import { expect, test, type BrowserContext } from '@playwright/test';

const id = '10000000-0000-4000-8000-000000000001';
const colorId = '30000000-0000-4000-8000-000000000001';

async function signInLocally(context: BrowserContext) {
  const userId = '20000000-0000-4000-8000-000000000001';
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: userId, aud: 'authenticated', role: 'authenticated', exp, iat: exp - 3600 })).toString('base64url'), 'isolated'].join('.');
  const session = { access_token: jwt, refresh_token: 'isolated-refresh', expires_in: 3600, expires_at: exp, token_type: 'bearer',
    user: { id: userId, email: 'admin@isolated.test', aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {} } };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
}

test('cart checkout reviews current items and completes a simulated Stripe payment', async ({ page, context }) => {
  await signInLocally(context);
  await page.goto('/pt/products/' + id + '/');
  await page.getByRole('radio', { name: 'Rosa', exact: true }).check();
  await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  await page.getByRole('dialog', { name: /Meu carrinho/ }).getByRole('link', { name: 'Finalizar compra', exact: true }).click();
  await expect(page).toHaveURL(/\/pt\/checkout\/$/);
  await expect(page.locator('.checkout-item-info')).toContainText('Rosa');
  await expect(page.locator('.checkout-total')).toContainText('54,90');
  await page.getByRole('button', { name: 'Continuar para pagamento de teste' }).click();
  await expect(page).toHaveURL(/localhost:4312\/checkout\/cs_test_/);
  await page.getByRole('button', { name: 'Complete test payment' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pagamento de teste confirmado');
  await expect(page.locator('.checkout-total')).toContainText('62,04');
  await expect(page.locator('.checkout-test-notice')).toContainText('Nenhum pagamento real');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('imaginne-cart-v1')!))).toHaveLength(1);
  await page.getByRole('link', { name: 'Ver detalhes do pedido', exact: true }).click();
  await expect(page.locator('.order-progress h2')).toHaveText('Pagamento confirmado');
  await expect(page.locator('.order-items')).toContainText('Vaso escultural');
});

test('buy now requires colour selection and opens review without opening the drawer', async ({ page, context }) => {
  await signInLocally(context);
  await page.goto('/pt/products/' + id + '/');
  await page.getByRole('link', { name: 'Comprar agora', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/pt/products/' + id + '/$'));
  await page.getByRole('radio', { name: 'Rosa', exact: true }).check();
  await page.getByRole('link', { name: 'Comprar agora', exact: true }).click();
  await expect(page).toHaveURL(/\/pt\/checkout\/$/);
  await expect(page.locator('.checkout-item-info')).toContainText('Vaso escultural');
  await expect(page.getByRole('dialog', { name: /Meu carrinho/ })).toHaveCount(0);
});

test('cancellation keeps the cart and an unpaid return never claims payment succeeded', async ({ page, context }) => {
  await signInLocally(context);
  await page.addInitScript(({ id, colorId }) => {
    if (!localStorage.getItem('imaginne-cart-v1')) localStorage.setItem('imaginne-cart-v1', JSON.stringify([{ id, colorId, quantity: 1 }]));
  }, { id, colorId });
  await page.goto('/pt/checkout/');
  await page.getByRole('button', { name: 'Continuar para pagamento de teste' }).click();
  await page.getByRole('link', { name: 'Cancel test payment' }).click();
  await expect(page.locator('.checkout-summary')).toContainText('O pagamento foi cancelado');
  await expect(page.locator('.checkout-item-info')).toContainText('Vaso escultural');
  await page.getByRole('button', { name: 'Continuar para pagamento de teste' }).click();
  await page.getByRole('button', { name: 'Simulate delayed payment' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aguardando confirmação do pagamento');
});

test('requires sign-in and blocks aggregate stock excess across colour variants', async ({ page, context }) => {
  await page.addInitScript(({ id, colorId }) => localStorage.setItem('imaginne-cart-v1', JSON.stringify([{ id, colorId, quantity: 1 }])), { id, colorId });
  await page.goto('/pt/checkout/');
  await expect(page.locator('.checkout-summary')).toContainText('Use Entrar');
  await expect(page.getByRole('button', { name: 'Continuar para pagamento de teste' })).toBeDisabled();
  await signInLocally(context);
  await page.goto('/pt/checkout/');
  await page.locator('.checkout-item input').fill('9');
  await expect(page.locator('.checkout-summary')).toContainText('ultrapassam o estoque');
  await expect(page.getByRole('button', { name: 'Continuar para pagamento de teste' })).toBeDisabled();
});

test('empty checkout and invalid return links are safe on mobile in each locale', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/checkout/', '/pt/checkout/', '/es/checkout/']) {
    await page.goto(path);
    await expect(page.locator('.checkout-empty')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('/pt/checkout/result/?session_id=cs_live_forged');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Não foi possível verificar este pagamento');
});

test('checkout fits mobile and the existing dark theme', async ({ page, context }) => {
  await signInLocally(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ id, colorId }) => {
    localStorage.setItem('imaginne-cart-v1', JSON.stringify([{ id, colorId, quantity: 2 }]));
    localStorage.setItem('imaginne-theme', 'dark');
  }, { id, colorId });
  await page.goto('/pt/checkout/');
  await expect(page.locator('.checkout-item-info')).toContainText('Vaso escultural');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/store-checkout-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/store-checkout-desktop.png', fullPage: true });
});
