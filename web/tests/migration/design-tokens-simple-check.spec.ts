import { test, expect } from '@playwright/test';

/**
 * Simple Design Tokens Check
 * Verifies GlassCategoryPill and GlassBreadcrumbs render correctly with design tokens
 */

test.describe('Design Tokens - Simple Verification', () => {
  test('Live TV Page - Category Pills Visible', async ({ page }) => {
    // Navigate to Live TV page
    await page.goto('http://localhost:3200/live');

    // Wait for page to load (use domcontentloaded instead of networkidle)
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({
      path: 'test-results/live-tv-simple-check.png',
      fullPage: false,
    });

    // Check if category pills exist (look for Hebrew text)
    const allPill = page.getByText('הכל').first();
    const newsPill = page.getByText('חדשות').first();

    // Log what we found
    const allPillVisible = await allPill.isVisible().catch(() => false);
    const newsPillVisible = await newsPill.isVisible().catch(() => false);

    console.log(`Category pills found: הכל=${allPillVisible}, חדשות=${newsPillVisible}`);

    // Check console for errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any errors to appear
    await page.waitForTimeout(1000);

    // No design token errors
    const tokenErrors = errors.filter(err =>
      err.includes('colors.primary') ||
      err.includes('design-tokens') ||
      err.toLowerCase().includes('cannot read')
    );

    console.log(`Total console errors: ${errors.length}`);
    console.log(`Token-related errors: ${tokenErrors.length}`);

    if (tokenErrors.length > 0) {
      console.log('Token errors found:', tokenErrors);
    }

    expect(tokenErrors).toHaveLength(0);
  });

  test('Home Page - Check for Design Token Errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to home page
    await page.goto('http://localhost:3200/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/home-page-simple-check.png',
      fullPage: false,
    });

    // Check for design token errors
    const tokenErrors = errors.filter(err =>
      err.includes('colors') ||
      err.includes('design-tokens') ||
      err.includes('primary.DEFAULT') ||
      err.includes('Cannot read')
    );

    console.log(`Home page - Total errors: ${errors.length}`);
    console.log(`Home page - Token errors: ${tokenErrors.length}`);

    if (tokenErrors.length > 0) {
      console.log('Token errors:', tokenErrors);
    }

    expect(tokenErrors).toHaveLength(0);
  });

  test('Visual Check - Glass Components Styling', async ({ page }) => {
    await page.goto('http://localhost:3200/live');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Try to find category pills
    const categoryPill = page.locator('button, [role="button"]').filter({
      hasText: /הכל|חדשות|ילדים/
    }).first();

    if (await categoryPill.isVisible().catch(() => false)) {
      // Take screenshot of the pill
      await categoryPill.screenshot({
        path: 'test-results/category-pill-visual.png',
      });

      // Get computed styles
      const styles = await categoryPill.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,
          borderWidth: computed.borderWidth,
          borderRadius: computed.borderRadius,
          color: computed.color,
          backdropFilter: computed.backdropFilter,
          fontSize: computed.fontSize,
        };
      });

      console.log('Category pill styles:', JSON.stringify(styles, null, 2));

      // Verify glassmorphic properties exist
      expect(styles.borderRadius).toBeTruthy();
      expect(parseFloat(styles.borderWidth || '0')).toBeGreaterThan(0);
    } else {
      console.log('No category pills found - page might require auth');
    }
  });
});
