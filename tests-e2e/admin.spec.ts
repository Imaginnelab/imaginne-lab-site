import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The admin is closed on the server: a visitor is sent to the home of the language and the
// answer never carries the dashboard. Nothing here signs in or writes.

const adminTitle = (locale: string): string => JSON.parse(readFileSync(`messages/admin/${locale}.json`, 'utf8')).title;

const doors = [
  { path: '/admin/', home: '/', locale: 'en' },
  { path: '/pt/admin/', home: '/pt/', locale: 'pt' },
  { path: '/es/admin/', home: '/es/', locale: 'es' },
];

for (const { path, home, locale } of doors) {
  test(`a visitor on ${path} is redirected to ${home} and never receives the dashboard`, async ({ request, page }) => {
    const first = await request.get(path, { maxRedirects: 0 });
    expect(first.status()).toBe(307);
    expect(new URL(first.headers().location, 'http://x').pathname).toBe(home);
    const body = await first.text();
    expect(body).not.toContain('data-admin-root');
    expect(body).not.toContain('admin-title');
    expect(body).not.toContain(adminTitle(locale));

    await page.goto(path);
    expect(new URL(page.url()).pathname).toBe(home);
    await expect(page.locator('[data-admin-root]')).toHaveCount(0);
  });
}

test('the old /admin/?lang= address does not open the dashboard to a visitor either', async ({ request }) => {
  for (const lang of ['pt', 'es', 'en', 'fr']) {
    const response = await request.get(`/admin/?lang=${lang}`, { maxRedirects: 0 });
    expect(response.status(), lang).toBe(307);
    expect(await response.text(), lang).not.toContain('data-admin-root');
  }
});

test('an action address called by a visitor answers without the dashboard', async ({ request }) => {
  // A made-up action id: the server must not run or reveal anything.
  const response = await request.post('/pt/admin/', {
    maxRedirects: 0,
    headers: { 'next-action': '0'.repeat(42), 'content-type': 'text/plain;charset=UTF-8' },
    data: '[]',
  });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(await response.text()).not.toContain('data-admin-root');
});
