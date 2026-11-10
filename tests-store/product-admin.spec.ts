import { expect, test, type BrowserContext } from '@playwright/test';

// A synthetic cookie accepted only by the isolated backend. No real account or backend is used.
async function signInLocally(context: BrowserContext) {
  const id = '20000000-0000-4000-8000-000000000001';
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', exp, iat: exp - 3600 })).toString('base64url'), 'isolated'].join('.');
  const session = { access_token: jwt, refresh_token: 'isolated-refresh', expires_in: 3600, expires_at: exp, token_type: 'bearer',
    user: { id, email: 'admin@isolated.test', aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {} } };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'),
    domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
}

test('admin photo opens the product and the new form groups translated specifications and measurements', async ({ page, context }) => {
  await signInLocally(context);
  await page.goto('/pt/admin/');
  await page.locator('.product-thumb-link').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vaso escultural');
  await page.goto('/pt/admin/');
  await page.locator('#product-new').click();
  const dialog = page.locator('#product-dialog');
  await expect(dialog.locator('#product-category_pt')).toBeVisible();
  for (const field of ['material', 'finish', 'care']) await expect(dialog.locator('#product-basic #product-' + field + '_pt')).toBeVisible();
  await expect(dialog.locator('#product-basic .product-language-buttons')).toHaveCount(1);
  await expect(dialog.locator('#product-basic .product-colors-field')).toHaveCount(3);
  await expect(dialog.locator('[id^="product-sizes_"], [id^="product-personalization_"], .product-extra-options')).toHaveCount(0);
  await expect(dialog.locator('#product-technical .product-colors-field')).toHaveCount(0);
  await expect(dialog.locator('.product-form-section')).toHaveCount(3);
  await expect(dialog.locator('#product-basic')).toContainText('Dados básicos');
  await expect(dialog.locator('#product-technical #product-price')).toHaveCount(1);
  await expect(dialog.locator('#product-media-section #product-photo')).toHaveCount(1);
  const portuguese = dialog.locator('fieldset[data-lang="pt"]');
  await dialog.locator('#product-colors_pt').fill('Verde oliva');
  await portuguese.locator('.product-color-entry').getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(dialog.locator('.product-color-grid')).toContainText('Verde oliva');
  await dialog.locator('#product-colors_pt').fill('Azul');
  await portuguese.locator('.product-color-entry').getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(dialog.locator('.product-color-grid li')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Remover cor Azul', exact: true }).click();
  await expect(dialog.locator('.product-color-grid li')).toHaveCount(1);
  await dialog.locator('.product-color-grid').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/store-admin-colors.png', animations: 'disabled' });
  await dialog.getByRole('button', { name: 'English', exact: true }).click();
  await expect(dialog.locator('#product-category_en')).toBeVisible();
  await expect(dialog.locator('#product-category_pt')).toBeHidden();
  await expect(dialog.locator('fieldset[data-lang="en"] .product-color-grid li')).toHaveCount(0);
  await dialog.locator('#product-colors_en').fill('Olive green');
  await dialog.locator('fieldset[data-lang="en"] .product-color-entry').getByRole('button', { name: 'Adicionar', exact: true }).click();
  for (const language of ['Español', 'Português', 'English']) {
    await dialog.getByRole('button', { name: language, exact: true }).click();
    const current = dialog.locator('fieldset:not([hidden])');
    await expect(current.locator('.product-colors-field')).toBeVisible();
    await expect(current.locator('.product-color-grid li')).toHaveCount(language === 'Español' ? 0 : 1);
    if (language !== 'Español') await expect(current.locator('.product-color-grid')).toContainText(language === 'English' ? 'Olive green' : 'Verde oliva');
    await expect(dialog.locator('#product-technical #product-price')).toHaveCount(1);
    await expect(dialog.locator('#product-media-section #product-photo')).toHaveCount(1);
  }
  await dialog.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: 'test-results/store-admin-new-product.png', animations: 'disabled' });
  await dialog.locator('#product-stock_quantity').scrollIntoViewIfNeeded();
  for (const field of ['width_cm', 'height_cm', 'depth_cm', 'weight_g', 'stock_quantity']) await expect(dialog.locator('#product-' + field)).toBeVisible();
  await page.screenshot({ path: 'test-results/store-admin-measurements.png', animations: 'disabled' });
  await dialog.locator('#product-media-section').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/store-admin-media.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await dialog.evaluate((element) => { element.scrollTop = 0; });
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/store-admin-new-product-mobile.png', animations: 'disabled' });
});

test('editing validates stock before writing and sends the new fields through the authorized action', async ({ page, context, request }) => {
  await signInLocally(context);
  await page.goto('/pt/admin/');
  await page.getByRole('button', { name: 'Editar Vaso personalizado', exact: true }).click();
  const dialog = page.locator('#product-dialog');
  await dialog.locator('#product-stock_quantity').fill('-1');
  await dialog.locator('#product-save').click();
  await expect(dialog.locator('#product-stock_quantity')).toHaveAttribute('aria-invalid', 'true');
  await dialog.locator('#product-stock_quantity').fill('12');
  await dialog.locator('#product-width_cm').fill('15.5');
  await dialog.locator('#product-category_pt').fill('Organização');
  await dialog.locator('#product-material_pt').fill('PLA reciclado');
  await dialog.locator('#product-name-pt').fill('Vaso de teste atualizado');
  await dialog.locator('#product-colors_pt').fill('Verde oliva');
  await dialog.locator('fieldset[data-lang="pt"] .product-color-entry input[type="color"]').fill('#556b2f');
  await dialog.locator('fieldset[data-lang="pt"] .product-color-entry').getByRole('button', { name: 'Adicionar', exact: true }).click();
  for (const language of ['English', 'Español', 'Português']) {
    await dialog.getByRole('button', { name: language, exact: true }).click();
    const current = dialog.locator('fieldset:not([hidden])');
    await expect(current.locator('.product-color-grid li')).toHaveCount(language === 'Português' ? 3 : 2);
    await expect(current.locator('.product-color-grid')).toContainText(language === 'English' ? 'Pink' : 'Rosa');
    await expect(dialog.locator('#product-width_cm')).toHaveValue('15.5');
    await expect(dialog.locator('#product-stock_quantity')).toHaveValue('12');
    await expect(dialog.locator('#product-photos .photo-item')).toHaveCount(1);
  }
  await dialog.locator('#product-save').click();
  await expect(dialog).toHaveCount(0);
  const writes = await (await request.get('http://127.0.0.1:4312/__writes')).json();
  const colors = [{ name: 'Rosa', hex: '#FFC0CB', locale: 'pt' }, { name: 'branco', hex: '#FFFFFF', locale: 'pt' }, { name: 'Verde oliva', hex: '#556B2F', locale: 'pt' },
    { name: 'Pink', hex: '#FFC0CB', locale: 'en' }, { name: 'White', hex: '#FFFFFF', locale: 'en' },
    { name: 'Rosa', hex: '#FFC0CB', locale: 'es' }, { name: 'Blanco', hex: '#FFFFFF', locale: 'es' }];
  expect(writes).toContainEqual(expect.objectContaining({ name_pt: 'Vaso de teste atualizado', category_pt: 'Organização', material_pt: 'PLA reciclado', stock_quantity: 12, width_cm: 15.5,
    colors, product_id: '10000000-0000-4000-8000-000000000002' }));
  const localizedKeys = Object.keys(writes[writes.length - 1]).filter((key) => /_(pt|en|es)$/.test(key));
  expect(localizedKeys.every((key) => /^(name|description|category|material|finish|care)_(pt|en|es)$/.test(key))).toBe(true);
});

test('photo navigation shows loading while the new page is loading and back controls are top arrows', async ({ page }) => {
  const id = '10000000-0000-4000-8000-000000000001';
  await page.goto('/pt/products/');
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(new RegExp('/pt/products/' + id + '/'), async (route) => { await gate; await route.continue(); });
  const photo = page.locator('.products-photo-link').first();
  const navigating = photo.click();
  const progress = page.locator('.navigation-progress[data-phase="loading"]');
  await expect(progress).toBeVisible();
  expect((await progress.boundingBox())!.height).toBeLessThanOrEqual(3);
  await expect(photo.locator('.navigation-progress')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/store-navigation-loading.png' });
  release();
  await navigating;
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vaso escultural');
  const back = page.locator('.page-back');
  await expect(back).toHaveCount(1);
  await expect(back).toHaveText('');
  await expect(back).toHaveAttribute('aria-label', 'Voltar aos produtos');
  const top = await back.boundingBox();
  const gallery = await page.locator('.product-gallery').boundingBox();
  expect(top!.y).toBeLessThan(gallery!.y);
  await back.click();
  await expect(page).toHaveURL(/\/pt\/products\/$/);
  await expect(page.locator('.page-back')).toHaveText('');
});

test('details still display existing products when the new database columns are absent', async ({ page }) => {
  await page.goto('/pt/products/10000000-0000-4000-8000-000000000005/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vaso anterior à migração');
  await expect(page.locator('.product-description')).toContainText('Impressa camada por camada');
  await expect(page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true })).toBeEnabled();
  await expect(page.locator('.product-detail-photo img').first()).toBeVisible();
});

test('home photos navigate to details and the technical sheet is translated', async ({ page }) => {
  await page.goto('/pt/');
  await page.locator('.products-card').filter({ hasText: 'Vaso personalizado' }).locator('.products-photo-link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vaso personalizado');
  await expect(page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true })).toBeDisabled();
  await expect(page.locator('.product-purchase')).toContainText('Esgotado');
  await page.goto('/products/10000000-0000-4000-8000-000000000001/');
  await expect(page.locator('.product-studio, .product-category')).toHaveCount(0);
  await expect(page.locator('.product-care')).toContainText('Clean with a damp cloth.');
  await expect(page.locator('.product-information')).toContainText('12.5 cm');
  await expect(page.locator('.product-information')).toContainText('180 g');
  await expect(page.locator('.product-purchase')).toContainText('8 units available');
  await expect(page.locator('.product-detail-colors')).toContainText('Pink');
  await expect(page.locator('.product-detail-colors')).not.toContainText('branco');
  await expect(page.getByRole('heading', { name: 'Product information', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Additional information', exact: true })).toHaveCount(0);
  await expect(page.locator('.product-information dt').filter({ hasText: /^(Sizes|Personalization)$/ })).toHaveCount(0);
});

test('product details surface translated colours and complete technical facts on desktop and mobile', async ({ page }) => {
  const id = '10000000-0000-4000-8000-000000000001';
  for (const [prefix, colours] of [['/pt', ['Rosa', 'branco']], ['', ['Pink', 'White']], ['/es', ['Rosa', 'Blanco']]] as const) {
    await page.goto(prefix + '/products/' + id + '/');
    await expect(page.locator('.product-detail-colors li')).toHaveText([...colours]);
    await expect(page.locator('.product-detail-swatch')).toHaveCount(2);
    await expect(page.locator('.product-information')).toContainText('PLA');
    await expect(page.locator('.product-information')).toContainText('180 g');
    await expect(page.locator('.product-detail-content .product-information')).toHaveCount(1);
    await expect(page.locator('.product-care p')).toBeVisible();
    await expect(page.locator('.product-gallery')).toContainText('3D');
  }
  await page.goto('/pt/products/' + id + '/');
  await expect(page.locator('.product-detail-price, .product-information-link')).toHaveCount(0);
  await expect(page.locator('.product-purchase-price')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open Next.js Dev Tools', exact: true })).toHaveCount(0);
  await expect(page.locator('.product-overview .product-colour-options')).toHaveCount(1);
  await expect(page.locator('.product-gallery-help, .product-key-facts, .product-colour-hint')).toHaveCount(0);
  const description = await page.locator('.product-description').boundingBox();
  const grid = await page.locator('.product-detail-grid').boundingBox();
  expect(description!.y).toBeGreaterThan(grid!.y);
  await page.screenshot({ path: 'test-results/store-details-specifications-desktop.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/store-details-specifications-mobile.png', fullPage: true, animations: 'disabled' });
});

test('theme and prepaint scripts do not report React script errors across layouts and languages', async ({ page, context }) => {
  const issues: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error' && /Encountered a script tag/.test(message.text())) issues.push(message.text()); });
  page.on('pageerror', (error) => issues.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('imaginne-theme', 'dark'); localStorage.setItem('imaginne-intro-seen', '1'); });
  await signInLocally(context);
  await page.goto('/pt/admin/');
  await page.locator('.product-thumb-link').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vaso escultural');
  // A dark choice saved earlier is ignored while the site is light only.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('.lang-toggle').click();
  await page.locator('#lang-menu').getByRole('link', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sculptural vase');
  await page.locator('.product-thumbnail').nth(1).click();
  await expect(page.locator('.product-thumbnail').nth(1)).toHaveAttribute('aria-pressed', 'true');
  expect(issues).toEqual([]);
});

test('product gallery supports dragging, arrows and keyboard without taking over 3D controls', async ({ page }) => {
  await page.goto('/pt/products/10000000-0000-4000-8000-000000000001/');
  const photo = page.locator('.product-detail-photo');
  const box = (await photo.boundingBox())!;
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Foto 2: Vaso escultural', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Imagem anterior', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Foto 1: Vaso escultural', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await photo.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Foto 2: Vaso escultural', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Ver em 3D', exact: true })).toHaveCount(1);
});
