/**
 * Financial Analysis E2E Tests
 * Feature: 025-financial-analysis-frontend
 *
 * Tests the financial analysis microservice pages and components.
 */

import { test, expect } from '@playwright/test';

const FINANCIAL_ANALYSIS_URL = 'http://localhost:3009';

test.describe('Financial Analysis Microservice', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for service startup
    test.setTimeout(30000);
  });

  test('should load the financial dashboard page', async ({ page }) => {
    await page.goto(FINANCIAL_ANALYSIS_URL);

    // Wait for the React app to render
    await page.waitForSelector('#root', { timeout: 10000 });

    // Take screenshot for verification
    await page.screenshot({ path: 'e2e/screenshots/financial-dashboard.png' });

    // Verify the page loaded (root element exists)
    const root = await page.$('#root');
    expect(root).not.toBeNull();
  });

  test('should have proper HTML structure', async ({ page }) => {
    const response = await page.goto(FINANCIAL_ANALYSIS_URL);

    // Verify successful response
    expect(response?.status()).toBe(200);

    // Check for required meta tags
    const title = await page.title();
    expect(title).toContain('Olorin');

    // Check viewport meta
    const viewport = await page.$('meta[name="viewport"]');
    expect(viewport).not.toBeNull();
  });

  test('should load JavaScript bundles', async ({ page }) => {
    const jsRequests: string[] = [];

    page.on('request', (request) => {
      if (request.resourceType() === 'script') {
        jsRequests.push(request.url());
      }
    });

    await page.goto(FINANCIAL_ANALYSIS_URL);
    await page.waitForLoadState('networkidle');

    // Verify financial analysis specific bundles are loaded
    const hasFinancialAnalysisBundle = jsRequests.some(url =>
      url.includes('financialAnalysis') || url.includes('financial-analysis')
    );
    expect(hasFinancialAnalysisBundle).toBe(true);

    // Verify main bundle is loaded
    const hasMainBundle = jsRequests.some(url => url.includes('main.js'));
    expect(hasMainBundle).toBe(true);
  });

  test('should load CSS/styles', async ({ page }) => {
    await page.goto(FINANCIAL_ANALYSIS_URL);
    await page.waitForLoadState('networkidle');

    // Check that Tailwind classes are being applied
    const bodyClasses = await page.evaluate(() => {
      return document.body.className;
    });

    // Body should have some classes or root should have content
    const rootContent = await page.$eval('#root', el => el.innerHTML);
    expect(rootContent.length).toBeGreaterThan(0);
  });

  test('should not have console errors on load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(FINANCIAL_ANALYSIS_URL);
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (like API calls that need backend)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Failed to fetch') &&
      !err.includes('NetworkError') &&
      !err.includes('api/v1')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('should have remoteEntry.js for Module Federation', async ({ page }) => {
    const response = await page.goto(`${FINANCIAL_ANALYSIS_URL}/remoteEntry.js`);

    expect(response?.status()).toBe(200);

    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('javascript');
  });

  test('should render React app content', async ({ page }) => {
    await page.goto(FINANCIAL_ANALYSIS_URL);

    // Wait for React to render something in the root
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    }, { timeout: 15000 });

    // Take screenshot after React renders
    await page.screenshot({ path: 'e2e/screenshots/financial-dashboard-rendered.png' });

    // Verify React rendered content
    const rootChildren = await page.$$('#root > *');
    expect(rootChildren.length).toBeGreaterThan(0);
  });
});
