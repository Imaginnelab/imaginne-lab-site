import { expect, test as setup } from '@playwright/test';
import { ADMIN_STATE } from '../playwright.config';

// Signs in once through the real dialog and keeps the session for the admin tests. The
// credentials come from .env.e2e.local and are never written to a report or a trace.
setup.use({ trace: 'off' });

setup('sign in as the test administrator', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-auth-open], .maintenance-login').first().click();
  const dialog = page.locator('#auth-dialog');
  await dialog.locator('input[name="email"]').fill(process.env.E2E_ADMIN_EMAIL ?? '');
  await dialog.locator('input[name="password"]').fill(process.env.E2E_ADMIN_PASSWORD ?? '');
  await dialog.locator('button[type="submit"]').click();
  // Signed in: the header shows the avatar, and an administrator sees the site itself.
  await expect(page.locator('[data-auth-open].is-authenticated')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('main section').first()).toBeVisible();
  await page.context().storageState({ path: ADMIN_STATE });
});