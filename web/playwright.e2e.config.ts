import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Testing Configuration
 *
 * Configuration for end-to-end functional tests.
 * Tests the actual user workflows and feature interactions.
 *
 * Local: Chromium only (fast feedback).
 * CI: All browsers (Chromium, Firefox, WebKit) + mobile viewports.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",

  // Run tests sequentially for e2e (to avoid race conditions)
  fullyParallel: false,
  workers: 1,

  // Stop after first N failures to get fast feedback
  maxFailures: process.env.CI ? 0 : 5,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Reporter to use
  reporter: [
    ["html", { outputFolder: "playwright-report/e2e" }],
    ["list"],
    ["json", { outputFile: "test-results/e2e-results.json" }],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3200",

    // Screenshot on failure (always on CI)
    screenshot: process.env.CI ? "on" : "only-on-failure",

    // Video on failure
    video: "retain-on-failure",

    // Trace on first retry
    trace: "on-first-retry",

    // Maximum time for actions
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Timeouts
  timeout: 60000,

  // Configure projects for major browsers
  projects: [
    // Desktop Chrome (always runs)
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Desktop Firefox (CI only)
    ...(process.env.CI
      ? [
          {
            name: "firefox-desktop",
            use: {
              ...devices["Desktop Firefox"],
              viewport: { width: 1920, height: 1080 },
            },
          },
        ]
      : []),

    // Desktop Safari (CI only)
    ...(process.env.CI
      ? [
          {
            name: "webkit-desktop",
            use: {
              ...devices["Desktop Safari"],
              viewport: { width: 1920, height: 1080 },
            },
          },
        ]
      : []),

    // Mobile viewports (CI only)
    ...(process.env.CI
      ? [
          {
            name: "mobile-375",
            use: {
              ...devices["iPhone 15"],
              viewport: { width: 375, height: 667 },
            },
          },
          {
            name: "tablet-768",
            use: {
              ...devices["iPad Mini"],
              viewport: { width: 768, height: 1024 },
            },
          },
        ]
      : []),
  ],

  // Start webpack dev server for E2E tests (reuses if already running)
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3200",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
