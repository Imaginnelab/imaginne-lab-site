import { expect, test, type Page } from '@playwright/test';

// A product with a 3D model, from the form to the database and back out, in a real browser.
// Same data rules as the other admin tests: the product is named `[E2E] …`, is born inactive
// and is deleted here, also when the test fails. Nothing else is touched.

const token = Math.random().toString(36).slice(2, 8).padEnd(6, 'y');
const name = `[E2E] Modelo ${token}`;
const mine = (page: Page) => page.locator('#products-list > li.product-row').filter({ hasText: token });

async function find(page: Page) {
  await page.goto('/pt/admin/#products');
  const box = page.locator('#products-tools .search-box');
  await box.locator('.search-toggle').click();
  await box.locator('.search-input').fill(token);
  await box.locator('.search-input').press('Enter');
  await expect(page.locator('#products-list')).not.toHaveAttribute('aria-busy', 'true');
  await expect(box.locator('.search-clear')).not.toHaveAttribute('aria-busy', 'true');
}

test.afterEach(async ({ page }) => {
  await find(page);
  for (let left = await mine(page).count(); left > 0; left = await mine(page).count()) {
    await mine(page).first().locator('.product-delete-btn').click();
    const confirm = page.locator('#product-delete');
    await confirm.locator('.btn-danger').click();
    await expect(confirm).toHaveCount(0, { timeout: 30_000 });
    await expect(mine(page)).toHaveCount(left - 1, { timeout: 30_000 });
  }
});

test('create a product with a 3D model, edit it and delete it', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/pt/admin/#products');
  const photo = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 120; canvas.height = 90;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#2f6f4f'; context.fillRect(0, 0, 120, 90);
    return canvas.toDataURL('image/png').split(',')[1];
  }), 'base64');

  await page.locator('#product-new').click();
  const dialog = page.locator('#product-dialog');
  for (const lang of ['pt', 'en', 'es']) {
    await dialog.locator('.product-language-buttons button').nth(['pt', 'en', 'es'].indexOf(lang)).click();
    await dialog.locator(`#product-name-${lang}`).fill(name);
    await dialog.locator(`#product-description-${lang}`).fill('Produto com modelo 3D criado por teste automático; pode ser apagado.');
  }
  await dialog.locator('#product-price').fill('12,50');
  await dialog.locator('#product-active').uncheck();
  await dialog.locator('#product-photo').setInputFiles({ name: 'e2e.png', mimeType: 'image/png', buffer: photo });
  await dialog.locator('#product-model').setInputFiles('public/assets/3d/lion-head/lion_head.glb');
  await expect(dialog.locator('#product-model-item .photo-meta')).toContainText('→', { timeout: 60_000 });
  await expect(dialog.locator('#product-save')).toBeEnabled({ timeout: 30_000 });
  await dialog.locator('#product-save').click();
  await expect(dialog).toHaveCount(0, { timeout: 90_000 });

  await find(page);
  await expect(mine(page)).toHaveCount(1, { timeout: 20_000 });
  await expect(mine(page)).toHaveClass(/is-inactive/);
  await expect(mine(page)).toContainText('3D');
  await expect(mine(page)).toContainText('12,50');
  await page.screenshot({ path: 'test-results/shots/admin-produto-3d-criado.png' });

  // Edit: the form comes back with the saved values, model included, and keeps them.
  await mine(page).locator('.product-actions button').first().click();
  await expect(dialog.locator('#product-name-pt')).toHaveValue(name);
  await expect(dialog.locator('#product-model-item')).toBeVisible();
  await expect(dialog.locator('#product-photos .photo-item')).toHaveCount(1);
  await dialog.locator('#product-price').fill('19,90');
  await dialog.locator('#product-name-pt').fill(`${name} editado`);
  await dialog.locator('#product-save').click();
  await expect(dialog).toHaveCount(0, { timeout: 60_000 });
  await expect(mine(page)).toHaveCount(1, { timeout: 20_000 });
  await expect(mine(page)).toContainText('editado');
  await expect(mine(page)).toContainText('19,90');
  await expect(mine(page)).toContainText('3D');
  await page.screenshot({ path: 'test-results/shots/admin-produto-3d-editado.png' });
  expect(errors).toEqual([]);
});
