import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Smoke tests of the migrated site: every language answers at its address with the right
// <html lang> and title, the old /en/ prefix leads to the clean address, the security
// headers are on every response and unknown pages are a real 404.
// They only read pages: nothing is signed up, signed in or written.

const title = (locale: string): string => JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')).metadata.title;
const account = (locale: string) => JSON.parse(readFileSync(`messages/account/${locale}.json`, 'utf8')).account as Record<string, string>;

const pages = [
  { locale: 'en', path: '/', lang: 'en' },
  { locale: 'pt', path: '/pt/', lang: 'pt-BR' },
  { locale: 'es', path: '/es/', lang: 'es' },
];

for (const { locale, path, lang } of pages) {
  test(`${path} answers in ${lang} with its own title`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page).toHaveTitle(title(locale));
  });
}

test('/en/ redirects to the address without the prefix', async ({ request }) => {
  const home = await request.get('/en/', { maxRedirects: 0 });
  expect(home.status()).toBe(308);
  expect(new URL(home.headers().location, 'http://x').pathname).toBe('/');
  const inner = await request.get('/en/products/', { maxRedirects: 0 });
  expect(inner.status()).toBe(308);
  expect(new URL(inner.headers().location, 'http://x').pathname).toBe('/products/');
});

test('security headers are present on pages', async ({ request }) => {
  for (const path of ['/', '/pt/', '/does-not-exist/']) {
    const headers = (await request.get(path)).headers();
    expect(headers['x-content-type-options'], path).toBe('nosniff');
    expect(headers['x-frame-options'], path).toBe('DENY');
    expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy'], path).toContain('camera=()');
    expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy'], path).toContain("object-src 'none'");
    expect(headers['x-powered-by'], path).toBeUndefined();
  }
});

test('an unknown address is a 404', async ({ request }) => {
  expect((await request.get('/does-not-exist/')).status()).toBe(404);
  expect((await request.get('/pt/nao-existe/')).status()).toBe(404);
  // A locale that is not offered is not a page either.
  expect((await request.get('/fr/')).status()).toBe(404);
});

test('the account dialog opens, switches to sign-up and closes without sending anything', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (request) => { if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`); });
  await page.goto('/pt/');
  // The header button, or the button of the maintenance screen while the site is closed.
  const trigger = page.locator('[data-auth-open], .maintenance-login').first();
  await trigger.click();
  const dialog = page.locator('#auth-dialog');
  const t = account('pt');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#auth-title')).toHaveText(t.login);
  await expect(dialog.locator('input[name="email"]')).toBeFocused();
  await expect(dialog.locator('input[name="name"]')).toBeHidden();
  await dialog.locator('.auth-switch button').click();
  await expect(dialog.locator('#auth-title')).toHaveText(t.signup);
  await expect(dialog.locator('input[name="name"]')).toBeVisible();
  await expect(dialog.locator('input[name="name"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(writes).toEqual([]);
});
