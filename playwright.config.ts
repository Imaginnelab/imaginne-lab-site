import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against a production build on a port of their own, so they never
// compete with the `npm run dev` server on 3000.
const PORT = 4310;

// Optional administrator account for the signed-in tests, kept in a file Git ignores:
//   .env.e2e.local  ->  E2E_ADMIN_EMAIL=...  E2E_ADMIN_PASSWORD=...
// Without it those tests are skipped; the visitor tests always run.
if (existsSync('.env.e2e.local')) {
  for (const line of readFileSync('.env.e2e.local', 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}
export const ADMIN_STATE = 'tests-e2e/.auth/admin.json';
const hasAdmin = !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD;

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: [/\.admin\.spec\.ts$/, /\.setup\.ts$/] },
    ...(hasAdmin
      ? [
          { name: 'sign-in', testMatch: /auth\.setup\.ts$/ },
          {
            name: 'admin',
            testMatch: /\.admin\.spec\.ts$/,
            dependencies: ['sign-in'],
            use: { ...devices['Desktop Chrome'], storageState: ADMIN_STATE },
          },
        ]
      : []),
  ],
  webServer: {
    command: `npm run build && npx next start --port ${PORT}`,
    // A static file: ready as soon as the server answers, whatever the pages do.
    url: `http://localhost:${PORT}/assets/img/logo-icon.svg`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});