import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Visual Design Token Testing
 */
export default defineConfig({
  testDir: './tests/visual-regression',
  testMatch: '**/*.spec.ts',

  fullyParallel: false, // Run sequentially for consistency
  retries: 0,
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report/visual' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3200',
    screenshot: 'on',
    video: 'off',
    trace: 'off',
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3200',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
