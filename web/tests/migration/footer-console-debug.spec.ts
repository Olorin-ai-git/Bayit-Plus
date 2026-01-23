/**
 * Footer Console Debug Test
 *
 * Captures all console output to debug why Footer isn't rendering
 */

import { test, expect } from '@playwright/test';

test.describe('Footer Console Debug', () => {
  test('Capture console errors and warnings', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    // Capture all console messages
    page.on('console', (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log(text);
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      const text = `[PAGE ERROR] ${error.message}`;
      errors.push(text);
      console.log(text);
    });

    // Navigate to homepage
    await page.goto('/');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Wait a bit for any async rendering
    await page.waitForTimeout(2000);

    // Check if Footer is in the DOM
    const footerExists = await page.locator('footer').count();
    console.log('Footer elements found:', footerExists);

    // Check for the GlassView with footer-like classes
    const glassViewCount = await page.locator('[class*="mt-auto"]').count();
    console.log('GlassView with mt-auto found:', glassViewCount);

    // Print all console messages
    console.log('\n===== All Console Messages =====');
    consoleMessages.forEach(msg => console.log(msg));

    // Print all errors
    console.log('\n===== All Errors =====');
    errors.forEach(err => console.log(err));

    // Check Layout component
    const hasLayout = await page.evaluate(() => {
      return !!document.querySelector('[class*="layout"]') || !!document.querySelector('main');
    });
    console.log('Has layout/main element:', hasLayout);

    expect(true).toBe(true);
  });
});
