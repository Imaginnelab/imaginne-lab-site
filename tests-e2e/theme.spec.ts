import { expect, test } from '@playwright/test';

// The site is light only for now (prepaint.js): neither the system setting nor a dark choice
// saved before the toggle was removed turns it dark.
test.use({ colorScheme: 'dark' });

test('the site stays light for a dark system and for a saved dark choice', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => localStorage.setItem('imaginne-theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
