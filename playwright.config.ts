import { defineConfig, devices } from '@playwright/test';

// Fixed container-internal port (host port varies but container always uses 5173)
const baseURL = 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server before running tests
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
});
