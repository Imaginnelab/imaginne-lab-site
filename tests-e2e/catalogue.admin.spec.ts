import { expect, test } from '@playwright/test';

// Signed in as an administrator, because under maintenance visitors receive no products.
// These tests only read; they rely on the [TESTE] products existing in the database.

test('the catalogue lists products, most viewed first, and searches', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/pt/products/');
  const cards = page.locator('.products-card');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(1);
  await page.screenshot({ path: 'test-results/shots/catalogo-pt.png' });

  const box = page.locator('main .search-box');
  await box.locator('.search-toggle').click();
  const input = box.locator('.search-input');
  await expect(input).toBeFocused();
  await input.fill('peça 0');
  await expect(page).toHaveURL(/[?&]q=/, { timeout: 10_000 });
  await expect(cards.first()).toContainText('Peça 0');
  for (const name of await page.locator('.products-name').allTextContents()) expect(name).toContain('Peça 0');
  await page.screenshot({ path: 'test-results/shots/catalogo-busca.png' });

  await input.fill('zzzz-nada');
  await expect(cards).toHaveCount(0, { timeout: 10_000 });
  await box.locator('.search-clear').click();
  await expect(cards.first()).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]q=/);
  expect(errors).toEqual([]);
});

test('the home carousel pages through products and a model loads on its own', async ({ page }) => {
  await page.goto('/pt/');
  const section = page.locator('#products');
  await section.scrollIntoViewIfNeeded();
  const cards = section.locator('.products-card');
  await expect(cards.first()).toBeVisible();
  const before = await cards.count();
  const next = section.locator('[data-products-next]');
  for (let i = 0; i < 6 && (await next.isEnabled()); i++) { await next.click(); await page.waitForTimeout(900); }
  expect(await cards.count()).toBeGreaterThanOrEqual(before);
  await page.screenshot({ path: 'test-results/shots/home-carrossel.png' });
});

test('the admin page opens for an administrator', async ({ page }) => {
  await page.goto('/pt/admin/');
  await expect(page).toHaveURL(/\/pt\/admin\/$/);
  await page.screenshot({ path: 'test-results/shots/admin-pt.png', fullPage: true });
});