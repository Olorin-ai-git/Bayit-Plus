import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/shared/testing/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env['CI'],
  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env['CI'] ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for each test action */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 30000
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*.e2e.test.ts'
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: '**/*.e2e.test.ts'
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: '**/*.e2e.test.ts'
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/investigation-creation.e2e.test.ts' // Selected tests for mobile
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/investigation-creation.e2e.test.ts' // Selected tests for mobile
    },

    /* Tablet testing */
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
      testMatch: '**/real-time-monitoring.e2e.test.ts' // Selected tests for tablet
    },

    /* Performance testing project */
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        video: 'off',
        screenshot: 'off'
      },
      testMatch: '**/*performance*.e2e.test.ts',
      timeout: 120000 // 2 minutes for performance tests
    },

    /* Visual regression testing project */
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: '**/*visual*.e2e.test.ts'
    },

    /* Accessibility testing project */
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: '**/*accessibility*.e2e.test.ts',
      timeout: 90000 // 1.5 minutes for accessibility tests
    },

    /* Cross-browser testing project */
    {
      name: 'cross-browser',
      use: {
        ...devices['Desktop Chrome']
      },
      testMatch: '**/*cross-browser*.e2e.test.ts',
      timeout: 180000 // 3 minutes for cross-browser tests
    },

    /* Cross-browser Chrome specific */
    {
      name: 'cross-browser-chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testMatch: '**/cross-browser.e2e.test.ts',
      timeout: 120000
    },

    /* Cross-browser Firefox specific */
    {
      name: 'cross-browser-firefox',
      use: {
        ...devices['Desktop Firefox']
      },
      testMatch: '**/cross-browser.e2e.test.ts',
      timeout: 120000
    },

    /* Cross-browser Safari specific */
    {
      name: 'cross-browser-safari',
      use: {
        ...devices['Desktop Safari']
      },
      testMatch: '**/cross-browser.e2e.test.ts',
      timeout: 120000
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
  },

  /* Output directory for test artifacts */
  outputDir: 'test-results/',

  /* Test metadata */
  metadata: {
    'Test Suite': 'Olorin Microservices E2E Tests',
    'Version': '1.0.0',
    'Environment': process.env['NODE_ENV'] || 'development',
    'Services': [
      'structured-investigation',
      'manual-investigation',
      'agent-analytics',
      'rag-intelligence',
      'visualization',
      'reporting',
      'core-ui',
      'design-system'
    ]
  },

  /* Test timeout - increased for investigation state management tests */
  timeout: 5 * 60 * 1000, // 5 minutes
  expect: {
    /* Maximum time expect() should wait for the condition to be met. */
    timeout: 5000,
    /* Threshold for visual comparisons */
    toHaveScreenshot: { threshold: 0.98, animations: 'disabled' },
  },
});
