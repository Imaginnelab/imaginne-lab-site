import { expect, test } from '@playwright/test';

// Picks a real GLB in the new-product form and checks it is optimised in the browser with the
// bundled libraries. Nothing is saved: the dialog is closed without submitting.
test('a 3D model is optimised locally and previewed before saving', async ({ page }) => {
  const external: string[] = [];
  const writes: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/esm\.sh|unpkg|jsdelivr/.test(url)) external.push(url);
    if (request.method() !== 'GET' && /supabase\.co\/(rest|storage)/.test(url)) writes.push(`${request.method()} ${url}`);
  });
  await page.goto('/pt/admin/');
  await page.locator('#product-new').click();
  const item = page.locator('#product-model-item');
  await page.locator('#product-model').setInputFiles('public/assets/3d/lion-head/lion_head.glb');
  await expect(item).toBeVisible();
  // "2,0 MB → 1,x MB": the arrow only appears once the optimised file replaced the original.
  await expect(item.locator('.photo-meta')).toContainText('→', { timeout: 60_000 });
  const meta = (await item.locator('.photo-meta').textContent()) ?? '';
  console.log('modelo:', meta.trim());
  await expect(page.locator('#product-model-error')).toBeEmpty();
  await expect(page.locator('model-viewer')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/shots/admin-modelo-otimizado.png' });
  expect(external).toEqual([]);
  expect(writes).toEqual([]);
});
