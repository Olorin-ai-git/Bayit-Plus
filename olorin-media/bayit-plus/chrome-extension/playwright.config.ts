import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'path';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'https://www.screenil.com',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'extension-tests',
      use: {
        ...devices['Desktop Chrome'],
        // Load unpacked extension from dist directory
        launchOptions: {
          args: [
            `--disable-extensions-except=${resolve(__dirname, 'dist')}`,
            `--load-extension=${resolve(__dirname, 'dist')}`,
          ],
        },
      },
    },
  ],

  // Run build before tests
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run build:dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
