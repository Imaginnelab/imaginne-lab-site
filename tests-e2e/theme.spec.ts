import { expect, test } from '@playwright/test';

// The light theme is the default for everyone; dark only after the visitor picks it.
test.use({ colorScheme: 'dark' });

test('a visitor whose system is dark still gets the light theme until they switch', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => localStorage.setItem('imaginne-theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
