import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against a production build on a port of their own, so they never
// compete with the `npm run dev` server on 3000.
const PORT = 4310;

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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
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
