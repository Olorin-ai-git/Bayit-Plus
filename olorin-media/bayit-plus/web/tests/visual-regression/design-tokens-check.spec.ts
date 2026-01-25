/**
 * Design Tokens Visual Verification Test
 *
 * Verifies that:
 * 1. Design tokens (colors) are properly loaded
 * 2. Glassmorphism effects are rendering correctly
 * 3. No broken styles or missing colors
 * 4. TailwindCSS classes are working as expected
 */

import { test, expect } from '@playwright/test';

test.describe('Design Tokens Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow animations to settle
  });

  test('Home Page - Design Tokens Rendering', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;

    // Take full page screenshot
    await page.screenshot({
      path: `tests/screenshots/design-tokens/${projectName}-home.png`,
      fullPage: true,
    });

    // Check for console errors (especially color-related)
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Verify key glassmorphism elements exist
    const glassElements = await page.locator('[class*="glass"]').count();
    expect(glassElements).toBeGreaterThan(0);

    // Verify primary color elements exist
    const primaryElements = await page.locator('[class*="primary"]').count();
    expect(primaryElements).toBeGreaterThan(0);

    // Check for critical CSS errors
    const hasCriticalErrors = consoleErrors.some((err) =>
      err.includes('color') || err.includes('style') || err.includes('CSS')
    );
    expect(hasCriticalErrors).toBe(false);
  });

  test('Live TV Page - Glass Effects', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;

    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `tests/screenshots/design-tokens/${projectName}-live.png`,
      fullPage: true,
    });

    // Verify backdrop blur is applied
    const blurElements = await page.locator('[class*="backdrop-blur"]').count();
    expect(blurElements).toBeGreaterThan(0);
  });

  test('Search Page - Color Scheme', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;

    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `tests/screenshots/design-tokens/${projectName}-search.png`,
      fullPage: true,
    });

    // Check for search input styling
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.count() > 0) {
      const bgColor = await searchInput.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );
      // Should not be default white (indicates proper glass styling)
      expect(bgColor).not.toBe('rgb(255, 255, 255)');
    }
  });

  test('Component Color Verification', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check primary color is applied (purple theme)
    const primaryColorElements = await page.$$('[class*="bg-primary"]');
    if (primaryColorElements.length > 0) {
      const bgColor = await primaryColorElements[0].evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );
      // Should be purple-ish (not black or white)
      expect(bgColor).not.toBe('rgb(0, 0, 0)');
      expect(bgColor).not.toBe('rgb(255, 255, 255)');
    }

    // Check glass background is applied
    const glassElements = await page.$$('[class*="bg-glass"]');
    if (glassElements.length > 0) {
      const bgColor = await glassElements[0].evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );
      // Glass should be semi-transparent dark
      expect(bgColor).toContain('rgba');
    }
  });

  test('Text Color Contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that text is visible (white on dark backgrounds)
    const textElements = await page.$$('p, h1, h2, h3, span');
    const textColors = await Promise.all(
      textElements.slice(0, 10).map((el) =>
        el.evaluate((e) => window.getComputedStyle(e).color)
      )
    );

    // Most text should be white or light colors
    const lightTextCount = textColors.filter(
      (color) => color.includes('rgb(255') || color.includes('rgba(255')
    ).length;
    expect(lightTextCount).toBeGreaterThan(0);
  });
});

test.describe('Responsive Design Tokens', () => {
  const breakpoints = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  for (const breakpoint of breakpoints) {
    test(`${breakpoint.name} - Home Page Glass Effects`, async ({ page }) => {
      await page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height,
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `tests/screenshots/design-tokens/${breakpoint.name}-home-glass.png`,
        fullPage: false,
      });

      // Verify glassmorphism at all breakpoints
      const glassCount = await page.locator('[class*="glass"]').count();
      expect(glassCount).toBeGreaterThan(0);
    });
  }
});
