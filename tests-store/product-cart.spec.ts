import { expect, test } from '@playwright/test';

const id = '10000000-0000-4000-8000-000000000001';
const quote = '10000000-0000-4000-8000-000000000002';
const missing = '10000000-0000-4000-8000-000000000099';
const productPath = '/pt/products/' + id + '/';

test('catalogue opens localized product details, shows all public fields and defers 3D downloads', async ({ page }) => {
  const models: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/product-models/')) models.push(request.url()); });
  await page.goto('/pt/products/');
  await page.locator('.products-name a').first().click();
  await expect(page).toHaveURL(new RegExp('/pt/products/' + id + '/$'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vaso escultural');
  await expect(page.locator('.product-description')).toContainText('Impressa camada por camada');
  await expect(page.locator('.product-purchase-price')).toContainText('49,90');
  await expect(page.getByRole('link', { name: 'Comprar agora', exact: true })).toHaveAttribute('href', '/pt/checkout/');
  await expect(page.locator('.product-photo-grid figure img').nth(1)).toBeVisible();
  expect(models).toEqual([]);
});

test('cart adds, changes quantities, persists after reload and restores focus after Escape', async ({ page }) => {
  await page.goto(productPath);
  await page.locator('.product-purchase').getByRole('button', { name: 'Aumentar quantidade' }).click();
  await page.getByRole('radio', { name: 'Rosa', exact: true }).check();
  const add = page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true });
  await add.click();
  const cart = page.getByRole('dialog', { name: /Meu carrinho/ });
  await expect(cart).toBeVisible();
  await expect(cart.locator('.cart-item-name')).toHaveText('Vaso escultural');
  await expect(cart.locator('.cart-subtotal strong')).toContainText('99,80');
  await cart.getByRole('button', { name: 'Aumentar quantidade' }).click();
  await expect(cart.locator('.cart-subtotal strong')).toContainText('149,70');
  await page.keyboard.press('Escape');
  await expect(cart).not.toBeVisible();
  await expect(add).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: 'Abrir carrinho (3)', exact: true }).click();
  await expect(page.locator('.cart-subtotal strong')).toContainText('149,70');
  await page.getByRole('button', { name: 'Remover: Vaso escultural · Rosa', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible();
});

test('switching language preserves the product route and local cart but refreshes its translation', async ({ page }) => {
  await page.goto(productPath);
  await page.getByRole('radio', { name: 'Rosa', exact: true }).check();
  await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  await expect(page.locator('.cart-item-name')).toHaveText('Vaso escultural');
  await page.keyboard.press('Escape');
  await page.locator('.lang-toggle').click();
  await page.locator('#lang-menu').getByRole('link', { name: 'Español', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/es/products/' + id + '/$'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Florero escultórico');
  await page.getByRole('button', { name: 'Abrir carrito (1)', exact: true }).click();
  await expect(page.locator('.cart-item-name')).toHaveText('Florero escultórico');
  await page.keyboard.press('Escape');
  await page.goto('/products/' + id + '/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sculptural vase');
  await page.getByRole('button', { name: 'Open cart (1)', exact: true }).click();
  await expect(page.locator('.cart-item-name')).toHaveText('Sculptural vase');
  await expect(page.locator('.cart-item-color')).toContainText('Pink');
});

test('on-request and unavailable items are explicit and do not inflate the subtotal', async ({ page }) => {
  await page.addInitScript(({ id, quote, missing }) => localStorage.setItem('imaginne-cart-v1', JSON.stringify([
    { id, quantity: 2 }, { id: quote, quantity: 1 }, { id: missing, quantity: 1 },
  ])), { id, quote, missing });
  await page.goto(productPath);
  await page.getByRole('button', { name: 'Abrir carrinho (4)', exact: true }).click();
  await expect(page.locator('.cart-items')).toContainText('Preço sob consulta');
  await expect(page.locator('.cart-items')).toContainText('Este produto não está mais disponível.');
  await expect(page.locator('.cart-subtotal strong')).toContainText('99,80');
  await expect(page.locator('.cart-summary')).toContainText('precisam de orçamento');
  await page.getByRole('button', { name: 'Remover', exact: true }).click();
  await expect(page.locator('.cart-unavailable')).toHaveCount(0);
});

test('empty cart follows the drawer reference and fits a narrow mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(productPath);
  await expect(page.locator('.product-detail-photo').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/store-product-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Abrir carrinho', exact: true }).click();
  const cart = page.getByRole('dialog', { name: /Meu carrinho/ });
  await expect(cart.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible();
  await page.screenshot({ path: 'test-results/store-cart-empty-mobile.png' });
  // Native modal focus remains inside the drawer when tabbing.
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
  expect(await cart.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await cart.getByRole('link', { name: 'Começar a comprar' }).click();
  await expect(page).toHaveURL(/\/pt\/products\/$/);
});

test('desktop details and populated cart match the established theme and layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(productPath);
  await page.locator('.product-detail-photo > img').first().evaluate((element: HTMLImageElement) => element.decode());
  await page.screenshot({ path: 'test-results/store-product-desktop.png', fullPage: true });
  await page.getByRole('radio', { name: 'Rosa', exact: true }).check();
  await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  await expect(page.locator('.cart-item-name')).toHaveText('Vaso escultural');
  await page.screenshot({ path: 'test-results/store-cart-desktop.png' });
});

test('invalid or missing products return 404 and backend errors offer a localized retry', async ({ page, request }) => {
  expect((await request.get('/pt/products/invalid/')).status()).toBe(404);
  expect((await request.get('/pt/products/' + missing + '/')).status()).toBe(404);
  await page.goto('/pt/products/10000000-0000-4000-8000-000000000003/');
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar este produto.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tentar de novo', exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Simulated unavailable backend');
});

test('forged browser prices are discarded and cart failure has a recovery action', async ({ page }) => {
  await page.addInitScript(({ id }) => {
    if (!localStorage.getItem('imaginne-cart-v1')) localStorage.setItem('imaginne-cart-v1', JSON.stringify([{ id, quantity: 1, price: 1 }]));
  }, { id });
  await page.goto(productPath);
  await page.getByRole('button', { name: 'Abrir carrinho', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    localStorage.setItem('imaginne-cart-v1', JSON.stringify([{ id: '10000000-0000-4000-8000-000000000003', quantity: 1 }]));
  });
  // A new document hydrates the external store from storage.
  await page.goto(productPath);
  await page.getByRole('button', { name: 'Abrir carrinho (1)', exact: true }).click();
  await expect(page.locator('.cart-feedback')).toContainText('Não foi possível atualizar os produtos.', { timeout: 15_000 });
  await expect(page.locator('.cart-feedback').getByRole('button', { name: 'Tentar de novo', exact: true })).toBeVisible();
});

test('cart stays usable when storage is full', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'imaginne-cart-v1') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.goto(productPath);
  await page.getByRole('radio', { name: 'Rosa', exact: true }).check();
  await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  await expect(page.locator('.cart-item-name')).toHaveText('Vaso escultural');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  await expect(page.locator('.cart-item input')).toHaveValue('2');
  await expect(page.locator('.cart-subtotal strong')).toContainText('99,80');
});

test('cart synchronizes across tabs and fits a 320px screen', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(productPath);
  const other = await context.newPage();
  await other.goto(productPath);
  await page.getByRole('radio', { name: 'Rosa', exact: true }).check();
  await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  await expect(other.getByRole('button', { name: 'Abrir carrinho (1)', exact: true })).toBeVisible();
  await expect(page.locator('.cart-item-name')).toHaveText('Vaso escultural');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/store-cart-mobile-320.png' });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/store-product-mobile-320.png', fullPage: true });
  await other.close();
});

test('selected colours create separate cart lines with product, colour and quantity after reload', async ({ page }) => {
  await page.goto(productPath);
  const add = page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true });
  await expect(page.locator('.product-field-error')).toHaveCount(0);
  await add.click();
  await expect(page.locator('.product-colour-options .product-field-error')).toContainText('Selecione uma cor');
  await page.locator('.product-purchase input[type="number"]').fill('0');
  await add.click();
  await expect(page.locator('.product-purchase > .product-field-error')).toContainText('quantidade');
  await page.locator('.product-purchase input[type="number"]').fill('1');
  await page.getByRole('radio', { name: 'Rosa', exact: true }).check();
  await expect(add).toBeEnabled();
  await page.locator('.product-purchase').getByRole('button', { name: 'Aumentar quantidade' }).click();
  await add.click();
  await expect(page.locator('.cart-item-color')).toContainText('Rosa');
  await page.keyboard.press('Escape');
  await page.getByRole('radio', { name: 'branco', exact: true }).check();
  await add.click();
  await expect(page.locator('.cart-item')).toHaveCount(2);
  const pink = page.locator('.cart-item').filter({ hasText: 'Cor: Rosa' });
  const white = page.locator('.cart-item').filter({ hasText: 'Cor: branco' });
  await expect(pink.locator('.cart-item-name')).toHaveText('Vaso escultural');
  await expect(pink.locator('input')).toHaveValue('2');
  await expect(white.locator('input')).toHaveValue('2');
  await pink.getByRole('button', { name: 'Aumentar quantidade' }).click();
  await expect(pink.locator('input')).toHaveValue('3');
  await expect(white.locator('input')).toHaveValue('2');
  await page.reload();
  await page.getByRole('button', { name: 'Abrir carrinho (5)', exact: true }).click();
  await expect(page.locator('.cart-item')).toHaveCount(2);
  await expect(pink.locator('input')).toHaveValue('3');
  await white.getByRole('button', { name: /Remover:/ }).click();
  await expect(page.locator('.cart-item')).toHaveCount(1);
  await expect(pink.locator('input')).toHaveValue('3');
  await page.screenshot({ path: 'test-results/store-cart-selected-colour.png', animations: 'disabled' });
});
