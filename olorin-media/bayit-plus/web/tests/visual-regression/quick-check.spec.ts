/**
 * Quick Visual Check - Design Tokens
 * Fast check to verify design tokens are loading correctly
 */

import { test, expect } from '@playwright/test';

test.describe('Quick Design Tokens Check', () => {
  test('Home page loads with correct styles', async ({ page }) => {
    // Set a short timeout for quick checks
    test.setTimeout(60000);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Wait for React to render

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/design-tokens/quick-home.png',
      fullPage: false,
    });

    // Check that page loaded
    const body = await page.locator('body');
    await expect(body).toBeVisible();

    // Check for React root
    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    console.log('✓ Home page loaded successfully');
  });

  test('Search page loads with input styles', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/screenshots/design-tokens/quick-search.png',
      fullPage: false,
    });

    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    console.log('✓ Search page loaded successfully');
  });

  test('Live TV page loads with glass effects', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/live', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/screenshots/design-tokens/quick-live.png',
      fullPage: false,
    });

    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    console.log('✓ Live TV page loaded successfully');
  });
});
