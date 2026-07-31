import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests: a real browser against the real client, the real API and a
 * real SQLite database. Nothing is mocked, which is the point — these are the
 * only tests that can catch a failure in the seam between the three.
 *
 * Uses the locally installed Chrome via `channel` rather than a downloaded
 * browser binary, so `npm install` stays small and CI needs no extra step.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    channel: 'chrome',
  },

  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],

  // Boots the whole stack, so a contributor runs `npm run test:e2e` and nothing
  // else. Reuses an already-running dev server locally.
  webServer: {
    command: 'npm run dev --workspace @news/api & npm run dev --workspace @news/web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: '../..',
  },
});
