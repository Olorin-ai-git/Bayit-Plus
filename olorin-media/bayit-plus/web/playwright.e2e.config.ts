import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration
 *
 * Configuration for end-to-end functional tests.
 * Tests the actual user workflows and feature interactions.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  // Run tests sequentially for e2e (to avoid race conditions)
  fullyParallel: false,
  workers: 1,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report/e2e' }],
    ['list'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3200',

    // Screenshot always (for verification)
    screenshot: 'on',

    // Video on failure
    video: 'retain-on-failure',

    // Trace on first retry
    trace: 'on-first-retry',

    // Maximum time for actions
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Timeouts
  timeout: 60000, // 60 seconds per test

  // Configure projects for major browsers
  projects: [
    // Desktop Chrome (primary)
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

    // Mobile viewports
    {
      name: 'mobile-375',
      use: {
        ...devices['iPhone 15'],
        viewport: { width: 375, height: 667 },
      },
    },

    {
      name: 'tablet-768',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
  ],

  // Use existing server (user said backend is running)
  webServer: {
    command: 'echo "Using existing server at port 3200"',
    url: 'http://localhost:3200',
    reuseExistingServer: true,
    timeout: 5000,
  },
});
