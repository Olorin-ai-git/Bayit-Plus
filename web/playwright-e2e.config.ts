import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 *
 * Runs end-to-end tests for admin pages and features.
 * Separate from migration visual regression tests.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Number of worker threads
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3200',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'retain-on-failure',

    // Trace on first retry
    trace: 'on-first-retry',

    // Maximum time for actions like `click()`
    actionTimeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    // Desktop Chrome
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Desktop Firefox
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Desktop Safari
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Mobile - iPhone 15
    {
      name: 'iphone-15',
      use: {
        ...devices['iPhone 15'],
        viewport: { width: 375, height: 667 },
      },
    },

    // Tablet - iPad
    {
      name: 'ipad',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },

    // Large Desktop - 2K
    {
      name: 'desktop-2k',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
      },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3200',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
