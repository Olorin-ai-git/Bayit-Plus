/**
 * Footer Isolated Test
 *
 * Tests the migrated Footer on a dedicated test page without Layout
 * This bypasses Header/Sidebar StyleSheet issues
 */

import { test, expect } from '@playwright/test';

test.describe('Footer Isolated Test', () => {
  test('Footer renders on /footer-test page', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    // Capture console
    page.on('console', (msg) => console.log(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (error) => {
      console.log(`[PAGE ERROR] ${error.message}`);
      errors.push(error.message);
    });

    // Navigate to footer test page
    await page.goto('/footer-test');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Wait for Footer to render
    await page.waitForTimeout(2000);

    // Check if Footer element exists
    const footerCount = await page.locator('footer').count();
    console.log('Footer elements found:', footerCount);

    // Check for GlassView component (Footer uses this)
    const glassViewCount = await page.locator('[class*="mt-auto"]').count();
    console.log('GlassView elements found:', glassViewCount);

    // Check page text
    const bodyText = await page.textContent('body');
    console.log('Page includes copyright:', bodyText?.includes('Bayit+'));

    // Screenshot
    await page.screenshot({ path: 'test-results/footer-isolated.png', fullPage: true });

    // Assertions
    expect(errors.length).toBe(0);  // No errors
    expect(footerCount).toBeGreaterThan(0);  // Footer element exists
  });
});
