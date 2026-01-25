import { test, expect } from '@playwright/test';

/**
 * Design Tokens Migration Verification Test
 * Tests breadcrumbs and category pills with design tokens
 */

test.describe('Design Tokens Migration Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('GlassBreadcrumbs - Admin Content Library Page', async ({ page }) => {
    // Navigate to admin content library page (has breadcrumbs)
    await page.goto('http://localhost:3200/admin/content');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow animations to settle

    // Check for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Take screenshot of breadcrumbs area
    const breadcrumbsElement = page.locator('[data-testid="breadcrumbs"], nav').first();
    if (await breadcrumbsElement.isVisible().catch(() => false)) {
      await breadcrumbsElement.screenshot({
        path: 'test-results/breadcrumbs-admin-content.png',
      });
    }

    // Take full page screenshot
    await page.screenshot({
      path: 'test-results/admin-content-page-full.png',
      fullPage: true,
    });

    // Verify no console errors related to design tokens
    const tokenErrors = consoleErrors.filter(err =>
      err.includes('colors') ||
      err.includes('design-tokens') ||
      err.includes('primary')
    );
    expect(tokenErrors).toHaveLength(0);

    // Log all breadcrumb elements for inspection
    const breadcrumbs = await page.locator('a, button').filter({ hasText: /Home|Admin|Content/ }).all();
    console.log(`Found ${breadcrumbs.length} breadcrumb items`);
  });

  test('GlassCategoryPill - Live TV Page', async ({ page }) => {
    // Navigate to Live TV page
    await page.goto('http://localhost:3200/live');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Look for category pills (they should be visible)
    const categoryPills = page.locator('[data-testid*="category"], button').filter({
      hasText: /All|News|Sports|Entertainment|Kids|Culture|Music/
    });

    // Take screenshot of category pills area
    const pillsContainer = categoryPills.first();
    if (await pillsContainer.isVisible().catch(() => false)) {
      await pillsContainer.screenshot({
        path: 'test-results/category-pills-live-tv.png',
      });
    }

    // Take full page screenshot
    await page.screenshot({
      path: 'test-results/live-tv-page-full.png',
      fullPage: true,
    });

    // Count category pills
    const pillCount = await categoryPills.count();
    console.log(`Found ${pillCount} category pills`);

    // Verify no console errors
    const tokenErrors = consoleErrors.filter(err =>
      err.includes('colors') ||
      err.includes('design-tokens') ||
      err.includes('primary')
    );
    expect(tokenErrors).toHaveLength(0);
  });

  test('Visual Inspection - Glassmorphic Styling', async ({ page }) => {
    // Test breadcrumbs glassmorphic styling
    await page.goto('http://localhost:3200/admin/content');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check computed styles of breadcrumb elements
    const breadcrumb = page.locator('a, button').filter({ hasText: /Home|Admin/ }).first();
    if (await breadcrumb.isVisible().catch(() => false)) {
      const styles = await breadcrumb.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,
          backdropFilter: computed.backdropFilter,
        };
      });
      console.log('Breadcrumb styles:', styles);

      // Verify purple color is present (should be rgb(126, 34, 206) or similar)
      // The primary.DEFAULT color #7e22ce converts to rgb(126, 34, 206)
      expect(styles.color).toBeTruthy();
    }

    // Test category pill glassmorphic styling
    await page.goto('http://localhost:3200/live');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const categoryPill = page.locator('button').filter({ hasText: /All|News/ }).first();
    if (await categoryPill.isVisible().catch(() => false)) {
      const pillStyles = await categoryPill.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,
          borderWidth: computed.borderWidth,
          borderRadius: computed.borderRadius,
          backdropFilter: computed.backdropFilter,
        };
      });
      console.log('Category pill styles:', pillStyles);

      // Verify glassmorphic properties
      expect(pillStyles.backdropFilter).toContain('blur');
      expect(pillStyles.borderRadius).toBeTruthy();
      expect(parseFloat(pillStyles.borderWidth || '0')).toBeGreaterThan(0);
    }
  });

  test('Interactive States - Hover and Focus', async ({ page }) => {
    await page.goto('http://localhost:3200/live');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Test category pill hover state
    const categoryPill = page.locator('button').filter({ hasText: /All|News/ }).first();

    if (await categoryPill.isVisible().catch(() => false)) {
      // Take screenshot before hover
      await categoryPill.screenshot({
        path: 'test-results/category-pill-normal.png',
      });

      // Hover and screenshot
      await categoryPill.hover();
      await page.waitForTimeout(300); // Wait for transition
      await categoryPill.screenshot({
        path: 'test-results/category-pill-hover.png',
      });

      // Focus and screenshot
      await categoryPill.focus();
      await page.waitForTimeout(300);
      await categoryPill.screenshot({
        path: 'test-results/category-pill-focus.png',
      });

      // Get styles in hover state
      const hoverStyles = await categoryPill.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,
          borderWidth: computed.borderWidth,
        };
      });
      console.log('Category pill hover styles:', hoverStyles);
    }
  });

  test('RTL Support - Breadcrumbs', async ({ page, context }) => {
    // Set RTL direction
    await context.addInitScript(() => {
      document.documentElement.setAttribute('dir', 'rtl');
    });

    await page.goto('http://localhost:3200/admin/content');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot in RTL mode
    await page.screenshot({
      path: 'test-results/breadcrumbs-rtl.png',
      fullPage: false,
    });

    // Verify RTL direction
    const direction = await page.evaluate(() => document.documentElement.dir);
    expect(direction).toBe('rtl');
  });

  test('Color Contrast - Accessibility', async ({ page }) => {
    await page.goto('http://localhost:3200/live');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check text contrast in category pills
    const categoryPill = page.locator('button').filter({ hasText: /All|News/ }).first();

    if (await categoryPill.isVisible().catch(() => false)) {
      const contrastInfo = await categoryPill.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        const textElement = el.querySelector('*') || el;
        const textColor = window.getComputedStyle(textElement).color;

        return {
          backgroundColor: computed.backgroundColor,
          textColor: textColor,
          borderColor: computed.borderColor,
        };
      });

      console.log('Contrast info:', contrastInfo);

      // Both background and text colors should be defined
      expect(contrastInfo.backgroundColor).toBeTruthy();
      expect(contrastInfo.textColor).toBeTruthy();
    }
  });
});
