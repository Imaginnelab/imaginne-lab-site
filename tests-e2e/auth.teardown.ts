import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test as teardown } from '@playwright/test';
import { ADMIN_STATE } from '../playwright.config';

// The saved session is a working administrator login, so it lives only while the tests run:
// signing out revokes it on Supabase, and the file is removed even if that fails. A failed
// sign-in leaves a page snapshot with the typed password in test-results; that goes too.
teardown.use({ trace: 'off' });

teardown('sign the test administrator out', async ({ browser }) => {
  try {
    if (!existsSync(ADMIN_STATE)) return;
    const context = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await context.newPage();
    await page.goto('/');
    await page.locator('[data-auth-open].is-authenticated').click();
    await page.locator('#account-menu .account-item-leave').click();
    await expect(page.locator('[data-auth-open]:not(.is-authenticated)')).toBeVisible({ timeout: 20_000 });
    await context.close();
  } finally {
    rmSync(ADMIN_STATE, { force: true });
    if (existsSync('test-results')) {
      for (const entry of readdirSync('test-results')) {
        if (entry.startsWith('auth.setup')) rmSync(join('test-results', entry), { recursive: true, force: true });
      }
    }
  }
});
