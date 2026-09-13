import { defineConfig } from '@playwright/test';

const baseURL = process.env.BAYIT_REVIEW_BASE_URL;
if (!baseURL) throw new Error('BAYIT_REVIEW_BASE_URL must identify the running candidate');

export default defineConfig({
  testDir: './tests',
  testMatch: 'review-overlay.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: '../.harness/runs/review-browser-results.json' }]],
  outputDir: '../.harness/runs/review-browser-artifacts',
  use: { baseURL, browserName: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 667 } } },
    { name: 'small-mobile', use: { viewport: { width: 320, height: 568 } } },
  ],
});
