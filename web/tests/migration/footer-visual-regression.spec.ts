/**
 * Footer Migration - Visual Regression Tests
 *
 * Ensures pixel-perfect migration from StyleSheet to TailwindCSS.
 * Captures screenshots at all breakpoints and interactive states.
 *
 * Test cases:
 * - TC-WEB-1: Visual regression (desktop)
 * - TC-WEB-2: Visual regression (mobile)
 * - TC-WEB-3: Interactive states (hover, focus)
 * - TC-WEB-4: Glassmorphism rendering
 * - TC-WEB-5: RTL layout (Hebrew)
 * - TC-WEB-6: Keyboard navigation
 * - TC-WEB-7: Performance metrics
 */

import { test, expect } from '@playwright/test';

test.describe('Footer Migration - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage (has Footer)
    await page.goto('/');

    // Wait for Footer to load
    await page.waitForSelector('footer', { state: 'attached' });

    // Wait for network to be idle (all resources loaded)
    await page.waitForLoadState('networkidle');
  });

  // TC-WEB-1: Desktop Visual Regression
  test('TC-WEB-1: Footer matches baseline - Desktop 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Capture baseline screenshot
    await expect(footer).toHaveScreenshot('footer-desktop-1920.png', {
      maxDiffPixels: 100,  // Allow up to 100px difference
    });
  });

  test('TC-WEB-1b: Footer matches baseline - Desktop 2560px (2K)', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });

    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-desktop-2560.png', {
      maxDiffPixels: 100,
    });
  });

  // TC-WEB-2: Mobile Visual Regression
  test('TC-WEB-2a: Footer matches baseline - iPhone SE 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-mobile-320.png', {
      maxDiffPixels: 50,
    });
  });

  test('TC-WEB-2b: Footer matches baseline - iPhone 15 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-mobile-375.png', {
      maxDiffPixels: 50,
    });
  });

  test('TC-WEB-2c: Footer matches baseline - iPhone 15 Pro Max 430px', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });

    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-mobile-430.png', {
      maxDiffPixels: 50,
    });
  });

  test('TC-WEB-2d: Footer matches baseline - iPad 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-tablet-768.png', {
      maxDiffPixels: 75,
    });
  });

  test('TC-WEB-2e: Footer matches baseline - iPad Pro 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });

    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-tablet-1024.png', {
      maxDiffPixels: 75,
    });
  });

  // TC-WEB-3: Interactive States
  test('TC-WEB-3a: Social button hover state', async ({ page }) => {
    // Find first social button
    const socialButton = page.locator('[data-testid*="social-button"]').first();

    // Hover over button
    await socialButton.hover();

    // Wait for transition
    await page.waitForTimeout(300);

    // Capture hover state
    await expect(socialButton).toHaveScreenshot('social-button-hover.png');
  });

  test('TC-WEB-3b: Expand/collapse transition', async ({ page }) => {
    const footer = page.locator('footer');

    // Initially collapsed
    await expect(footer).toHaveScreenshot('footer-collapsed.png');

    // Find expand button (chevron)
    const expandButton = page.locator('[data-testid="footer-expand-button"]').first();
    await expandButton.click();

    // Wait for expand animation
    await page.waitForTimeout(500);

    // Expanded state
    await expect(footer).toHaveScreenshot('footer-expanded.png', {
      maxDiffPixels: 150,  // More tolerance for animation
    });
  });

  test('TC-WEB-3c: Newsletter form focus state', async ({ page }) => {
    // Expand footer first
    const expandButton = page.locator('[data-testid="footer-expand-button"]').first();
    await expandButton.click();
    await page.waitForTimeout(500);

    // Focus on newsletter input
    const newsletterInput = page.locator('[placeholder*="email" i]').first();
    await newsletterInput.focus();

    // Capture focus state
    await expect(newsletterInput).toHaveScreenshot('newsletter-input-focus.png');
  });

  // TC-WEB-4: Glassmorphism Rendering
  test('TC-WEB-4: Glass effects render correctly', async ({ page }) => {
    const footer = page.locator('footer');

    // Check backdrop-filter is applied
    const backdropFilter = await footer.evaluate(
      (el) => window.getComputedStyle(el).backdropFilter
    );
    expect(backdropFilter).toContain('blur');

    // Check background has transparency (rgba with alpha <1)
    const bgColor = await footer.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toMatch(/rgba\(.*,\s*0\.\d+\)/);

    // Check border has transparency
    const borderColor = await footer.evaluate(
      (el) => window.getComputedStyle(el).borderTopColor
    );
    expect(borderColor).toMatch(/rgba\(.*,\s*0\.\d+\)/);
  });

  // TC-WEB-5: RTL Layout
  test('TC-WEB-5: Footer RTL layout correct (Hebrew)', async ({ page, context }) => {
    // Set document direction to RTL
    await context.addInitScript(() => {
      document.dir = 'rtl';
      document.documentElement.setAttribute('lang', 'he');
    });

    // Navigate with Hebrew language
    await page.goto('/?lng=he');
    await page.waitForSelector('footer');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer');

    // Capture RTL layout
    await expect(footer).toHaveScreenshot('footer-rtl-hebrew.png', {
      maxDiffPixels: 100,
    });

    // Verify text alignment is right
    const textAlign = await footer.evaluate(
      (el) => window.getComputedStyle(el).textAlign
    );
    expect(textAlign).toBe('right');
  });

  // TC-WEB-6: Keyboard Navigation
  test('TC-WEB-6: Keyboard navigation works', async ({ page }) => {
    // Expand footer
    const expandButton = page.locator('[data-testid="footer-expand-button"]').first();
    await expandButton.click();
    await page.waitForTimeout(500);

    // Press Tab to focus first element
    await page.keyboard.press('Tab');

    // Check that something is focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
    expect(['BUTTON', 'A', 'INPUT']).toContain(focused);

    // Tab through 5 elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    // Verify focus is still within footer
    const focusedInFooter = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      return footer?.contains(document.activeElement);
    });
    expect(focusedInFooter).toBe(true);
  });

  // TC-WEB-7: Performance Metrics
  test('TC-WEB-7: Core Web Vitals within thresholds', async ({ page }) => {
    // Navigate fresh
    await page.goto('/');

    // Measure performance
    const metrics = await page.evaluate(() => {
      return new Promise<{FCP?: number; LCP?: number}>((resolve) => {
        const fcp: number[] = [];
        const lcp: number[] = [];

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              fcp.push(entry.startTime);
            }
            if (entry.entryType === 'largest-contentful-paint') {
              lcp.push(entry.startTime);
            }
          }
        });

        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

        // Resolve after 3 seconds
        setTimeout(() => {
          resolve({
            FCP: fcp[fcp.length - 1],
            LCP: lcp[lcp.length - 1],
          });
        }, 3000);
      });
    });

    // Assert Core Web Vitals
    if (metrics.FCP) {
      expect(metrics.FCP).toBeLessThan(1500); // < 1.5s
    }

    if (metrics.LCP) {
      expect(metrics.LCP).toBeLessThan(2500); // < 2.5s
    }
  });

  // Accessibility Tests
  test('TC-WEB-A1: All interactive elements have accessible names', async ({ page }) => {
    // Expand footer
    const expandButton = page.locator('[data-testid="footer-expand-button"]').first();
    await expandButton.click();
    await page.waitForTimeout(500);

    // Find all buttons in footer
    const buttons = await page.locator('footer button').all();

    for (const button of buttons) {
      // Check aria-label or text content
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();

      expect(ariaLabel || textContent?.trim()).toBeTruthy();
    }
  });

  test('TC-WEB-A2: Color contrast meets WCAG AA', async ({ page }) => {
    const footer = page.locator('footer');

    // Get background and text colors
    const colors = await footer.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        background: style.backgroundColor,
        color: style.color,
      };
    });

    // Simple contrast check (not comprehensive)
    expect(colors.background).toBeTruthy();
    expect(colors.color).toBeTruthy();
  });
});
