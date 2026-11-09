import { defineConfig, devices } from '@playwright/test';

// This suite never reads or writes the real Supabase backend or signs in as an administrator.
export default defineConfig({
  testDir: './tests-store',
  fullyParallel: true,
  workers: 2,
  use: { baseURL: 'http://localhost:4311', trace: 'retain-on-failure', channel: process.env.PLAYWRIGHT_CHANNEL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'node tests-store/fixtures/backend.mjs', url: 'http://127.0.0.1:4312/health', reuseExistingServer: false },
    {
      command: 'node node_modules/next/dist/bin/next dev --port 4311',
      url: 'http://localhost:4311/assets/img/logo-icon.svg', reuseExistingServer: false, timeout: 120_000,
      env: { IMAGINNE_STORE_TEST: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:4312', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'isolated-test-key',
        STRIPE_CHECKOUT_ENABLED: 'true', CHECKOUT_SITE_URL: 'http://localhost:4311', STRIPE_SECRET_KEY: 'rk_test_isolated',
        STRIPE_WEBHOOK_SECRET: 'whsec_isolated', STRIPE_TEST_SHIPPING_CENTS: '500', STRIPE_TAX_ENABLED: 'true' },
    },
  ],
});
