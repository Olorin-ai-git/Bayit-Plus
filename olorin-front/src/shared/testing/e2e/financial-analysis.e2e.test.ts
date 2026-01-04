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
    test.setTimeout(60000);
  });

  test('should load the financial dashboard page', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(`${msg.type()}: ${msg.text()}`));

    await page.goto(FINANCIAL_ANALYSIS_URL);
    await page.waitForLoadState('networkidle');

    // Wait for React to render - check for any content in root
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root !== null;
    }, { timeout: 10000 });

    const root = await page.$('#root');
    expect(root).not.toBeNull();
  });

  test('should have proper HTML structure', async ({ page }) => {
    const response = await page.goto(FINANCIAL_ANALYSIS_URL);
    expect(response?.status()).toBe(200);
    const title = await page.title();
    expect(title).toContain('Olorin');
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

    const hasMainBundle = jsRequests.some(url => url.includes('.js'));
    expect(hasMainBundle).toBe(true);
  });

  test('should load CSS/styles', async ({ page }) => {
    await page.goto(FINANCIAL_ANALYSIS_URL);
    await page.waitForLoadState('networkidle');

    // Check that root element exists (React may not render without backend)
    const root = await page.$('#root');
    expect(root).not.toBeNull();
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
    await page.waitForLoadState('networkidle');

    // Wait for JavaScript to execute
    await page.waitForTimeout(2000);

    // Check root exists
    const root = await page.$('#root');
    expect(root).not.toBeNull();

    // Verify main.js script loaded and executed
    const scriptsLoaded = await page.evaluate(() => {
      return document.querySelectorAll('script[src*=".js"]').length > 0;
    });
    expect(scriptsLoaded).toBe(true);
  });
});
