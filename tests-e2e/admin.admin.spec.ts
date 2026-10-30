import { expect, test, type Page } from '@playwright/test';

// The dashboard in a real browser, signed in as the test administrator.
// Rules for the data (this is the production database): everything created here is named
// `[E2E] …` / `E2E-…`, is born inactive and is deleted by the test itself, also when it fails
// (afterEach). Nothing else is edited or deleted, and the maintenance switch is never touched.

test.describe.configure({ mode: 'serial' });

const token = Math.random().toString(36).slice(2, 8).padEnd(6, 'x');
const couponCode = `E2E-${token.toUpperCase()}`;
const productName = `[E2E] Peça ${token}`;
const shot = (name: string) => `test-results/shots/${name}.png`;

const rows = (page: Page, panel: 'products' | 'coupons') => page.locator(`#${panel}-list > li.product-row`);
const count = async (page: Page, panel: 'products' | 'coupons') => Number((await page.locator(`#tab-${panel} .admin-tab-count`).innerText()).replace(/\D/g, ''));

async function open(page: Page, panel: 'products' | 'coupons' = 'products') {
  await page.goto(`/pt/admin/#${panel}`);
  await expect(page.locator(`#tab-${panel}`)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator(`#${panel}`)).toBeVisible();
}
async function search(page: Page, panel: 'products' | 'coupons', term: string) {
  const box = page.locator(`#${panel}-tools .search-box`);
  const input = box.locator('.search-input');
  if (!(await input.isVisible()) || (await box.getAttribute('class'))?.includes('is-open') !== true) await box.locator('.search-toggle').click();
  await input.fill(term);
  await input.press('Enter');
  await expect(page.locator(`#${panel}-list`)).not.toHaveAttribute('aria-busy', 'true');
  await expect(box.locator('.search-clear')).not.toHaveAttribute('aria-busy', 'true');
}
// Deletes, through the interface, every row of the panel that carries this run's token.
async function purge(page: Page, panel: 'products' | 'coupons') {
  await open(page, panel);
  await search(page, panel, token);
  const mine = rows(page, panel).filter({ hasText: new RegExp(token, 'i') });
  for (let left = await mine.count(); left > 0; left = await mine.count()) {
    await mine.first().locator('.product-delete-btn').click();
    const confirm = page.locator(`#${panel === 'products' ? 'product' : 'coupon'}-delete`);
    await confirm.locator('.btn-danger').click();
    await expect(confirm).toHaveCount(0, { timeout: 30_000 });
    await expect(mine).toHaveCount(left - 1, { timeout: 30_000 });
  }
}

test('tabs switch between products and coupons, keep their counts and the hash', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/pt/admin/');
  const products = page.locator('#tab-products'), coupons = page.locator('#tab-coupons');
  await expect(products).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#products')).toBeVisible();
  await expect(page.locator('#coupons')).toBeHidden();
  expect(await count(page, 'products')).toBeGreaterThan(12);
  expect(Number.isInteger(await count(page, 'coupons'))).toBe(true);
  await page.screenshot({ path: shot('admin-produtos'), fullPage: true });

  await coupons.click();
  await expect(coupons).toHaveAttribute('aria-selected', 'true');
  await expect(products).toHaveAttribute('tabindex', '-1');
  await expect(page.locator('#coupons')).toBeVisible();
  await expect(page.locator('#products')).toBeHidden();
  await expect(page).toHaveURL(/#coupons$/);
  await page.screenshot({ path: shot('admin-cupons'), fullPage: true });

  // The arrow keys move between the tabs, and the address remembers the tab on reload.
  await coupons.press('ArrowLeft');
  await expect(products).toBeFocused();
  await expect(page).toHaveURL(/#products$/);
  await products.press('End');
  await expect(coupons).toHaveAttribute('aria-selected', 'true');
  await page.reload();
  await expect(coupons).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#coupons')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the product list searches and pages on scroll', async ({ page }) => {
  await open(page);
  const list = rows(page, 'products');
  await expect(list).toHaveCount(12);
  const total = await count(page, 'products');

  // Infinite list: reaching the end brings the remaining rows, with none repeated.
  await page.locator('#products .list-more').scrollIntoViewIfNeeded();
  await expect(list).toHaveCount(total, { timeout: 20_000 });
  await expect(page.locator('#products .list-more')).toHaveAttribute('data-mode', 'end');
  const names = await page.locator('#products-list .product-name-text').allTextContents();
  expect(names.length).toBe(total);
  await page.screenshot({ path: shot('admin-produtos-todos'), fullPage: true });

  await search(page, 'products', 'peça 0');
  await expect(list.first()).toBeVisible();
  for (const name of await page.locator('#products-list .product-name-text').allTextContents()) expect(name).toContain('Peça 0');
  expect(await list.count()).toBeLessThan(total);
  // The tab keeps counting everything, not the search.
  expect(await count(page, 'products')).toBe(total);
  await page.screenshot({ path: shot('admin-produtos-busca') });

  await search(page, 'products', 'zzzz-nada');
  await expect(list).toHaveCount(0);
  await expect(page.locator('#products .products-state')).toBeVisible();
  await page.locator('#products-tools .search-clear').click();
  await expect(list).toHaveCount(12, { timeout: 20_000 });
});

test.describe('coupon', () => {
  test.afterEach(async ({ page }) => { await purge(page, 'coupons'); });

  test('create, edit, activate and delete a test coupon', async ({ page }) => {
    await open(page, 'coupons');
    const before = await count(page, 'coupons');
    await page.locator('#coupon-new').click();
    const dialog = page.locator('#coupon-dialog');
    await expect(dialog.locator('#coupon-code')).toBeFocused();
    // An empty form is refused in the browser, with nothing sent.
    await dialog.locator('#coupon-save').click();
    await expect(dialog.locator('#coupon-code')).toHaveAttribute('aria-invalid', 'true');
    await dialog.locator('#coupon-code').fill(couponCode.toLowerCase());
    await expect(dialog.locator('#coupon-code')).toHaveValue(couponCode);
    await dialog.locator('#coupon-value').fill('15');
    await dialog.locator('#coupon-active').uncheck();
    await dialog.locator('#coupon-save').click();
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });

    const row = rows(page, 'coupons').filter({ hasText: couponCode });
    await expect(row).toHaveCount(1, { timeout: 20_000 });
    await expect(row).toHaveClass(/is-inactive/);
    await expect(row.locator('.coupon-discount')).toContainText('15');
    await expect(page.locator('#tab-coupons .admin-tab-count')).toHaveText(String(before + 1));
    await page.screenshot({ path: shot('admin-cupom-criado') });

    // The same code again is refused with its own message and the dialog stays open.
    await page.locator('#coupon-new').click();
    await dialog.locator('#coupon-code').fill(couponCode);
    await dialog.locator('#coupon-value').fill('5');
    await dialog.locator('#coupon-active').uncheck();
    await dialog.locator('#coupon-save').click();
    await expect(dialog.locator('.form-error')).not.toBeEmpty({ timeout: 30_000 });
    await dialog.locator('.admin-dialog-close').click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toHaveCount(1);

    await row.locator('.product-actions button').nth(0).click();
    await expect(dialog.locator('#coupon-code')).toHaveValue(couponCode);
    await expect(dialog.locator('#coupon-active')).not.toBeChecked();
    await dialog.locator('#coupon-value').fill('20');
    await dialog.locator('#coupon-max').fill('3');
    await dialog.locator('#coupon-save').click();
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });
    await expect(row.locator('.coupon-discount')).toContainText('20', { timeout: 20_000 });
    await expect(row.locator('.coupon-uses')).toContainText('3');
    await expect(row).toHaveClass(/is-inactive/);

    await row.locator('.product-actions button').nth(1).click();
    await expect(row).not.toHaveClass(/is-inactive/, { timeout: 30_000 });
    await page.screenshot({ path: shot('admin-cupom-ativo') });

    await row.locator('.product-delete-btn').click();
    const confirm = page.locator('#coupon-delete');
    await expect(confirm).toContainText(couponCode);
    await confirm.locator('.btn-danger').click();
    await expect(confirm).toHaveCount(0, { timeout: 30_000 });
    await expect(row).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('#tab-coupons .admin-tab-count')).toHaveText(String(before));
  });
});

test.describe('product', () => {
  test.afterEach(async ({ page }) => { await purge(page, 'products'); });

  test('create, duplicate and delete a test product with a photo', async ({ page }) => {
    test.setTimeout(120_000);
    await open(page);
    const before = await count(page, 'products');
    // A small real picture, drawn here.
    const photo = Buffer.from(await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 96; canvas.height = 96;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#e8590c'; context.fillRect(0, 0, 96, 96);
      context.fillStyle = '#fff'; context.fillRect(24, 24, 48, 48);
      return canvas.toDataURL('image/png').split(',')[1];
    }), 'base64');

    await page.locator('#product-new').click();
    const dialog = page.locator('#product-dialog');
    await expect(dialog.locator('#product-name-pt')).toBeFocused();
    for (const lang of ['pt', 'en', 'es']) {
      await dialog.locator('.product-language-buttons button').nth(['pt', 'en', 'es'].indexOf(lang)).click();
      await dialog.locator(`#product-name-${lang}`).fill(productName);
      await dialog.locator(`#product-description-${lang}`).fill('Item criado por teste automático; pode ser apagado.');
    }
    await dialog.locator('#product-active').uncheck();
    // Without a photo the form is refused in the browser.
    await dialog.locator('#product-save').click();
    await expect(dialog.locator('#product-photo')).toHaveAttribute('aria-invalid', 'true');
    await dialog.locator('#product-photo').setInputFiles({ name: 'e2e.png', mimeType: 'image/png', buffer: photo });
    await expect(dialog.locator('#product-photos .photo-item')).toHaveCount(1);
    await expect(dialog.locator('#product-save')).toBeEnabled({ timeout: 20_000 });
    await page.screenshot({ path: shot('admin-produto-formulario') });
    await dialog.locator('#product-save').click();
    await expect(dialog).toHaveCount(0, { timeout: 60_000 });

    await search(page, 'products', token);
    const mine = rows(page, 'products').filter({ hasText: token });
    await expect(mine).toHaveCount(1, { timeout: 20_000 });
    await expect(mine).toHaveClass(/is-inactive/);
    // The photo was stored and is served.
    const stored = await mine.locator('.product-thumb').getAttribute('src');
    expect((await page.request.get(stored!)).status()).toBe(200);
    await page.screenshot({ path: shot('admin-produto-criado') });

    await mine.locator('.product-actions button').nth(1).click();
    await expect(dialog.locator('#product-name-pt')).not.toHaveValue(productName);
    await expect(dialog.locator('#product-name-pt')).toHaveValue(new RegExp(token));
    await expect(dialog.locator('#product-active')).not.toBeChecked();
    await expect(dialog.locator('#product-photos .photo-item')).toHaveCount(1);
    await dialog.locator('#product-save').click();
    await expect(dialog).toHaveCount(0, { timeout: 60_000 });
    await expect(mine).toHaveCount(2, { timeout: 20_000 });
    for (const row of await mine.all()) await expect(row).toHaveClass(/is-inactive/);
    // The copy has a file of its own, so deleting one never breaks the other.
    const sources = await mine.locator('.product-thumb').evaluateAll((images) => images.map((image) => (image as HTMLImageElement).src));
    expect(new Set(sources).size).toBe(2);
    await page.screenshot({ path: shot('admin-produto-duplicado') });

    await purge(page, 'products');
    await expect(mine).toHaveCount(0);
    // Asked past the CDN cache, which may keep serving a deleted public file for a while.
    for (const source of sources) expect((await page.request.get(`${source}?gone=${token}`)).status(), source).not.toBe(200);
    await page.locator('#products-tools .search-clear').click();
    await expect(page.locator('#tab-products .admin-tab-count')).toHaveText(String(before), { timeout: 20_000 });
  });
});
