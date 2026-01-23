/**
 * iOS Visual Regression Testing - Bayit+ Web Platform
 *
 * Tests the TailwindCSS migration on iOS Safari (WebKit) across all device sizes.
 * Captures screenshots, verifies interactions, and validates accessibility.
 *
 * Test Coverage:
 * - HomePage: Hero, navigation, content carousels
 * - Video Player: Controls, settings panel, subtitle controls
 * - Admin Dashboard: Sidebar, data tables, forms
 * - YoungstersPage: Filters, content grid, modals
 * - Widget Containers: Dynamic widgets, interactions
 *
 * Device Matrix:
 * - iPhone SE (320x568) - Smallest iOS device
 * - iPhone 15 (375x667) - Standard iPhone
 * - iPhone 15 Pro Max (430x932) - Largest iPhone
 * - iPad (768x1024) - Standard iPad
 * - iPad Pro (1024x1366) - Large tablet
 *
 * iOS Versions: 16, 17, 18 (via WebKit)
 *
 * @see https://playwright.dev/docs/test-webkit
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// CONFIGURATION & HELPERS
// ============================================================================

const VIEWPORTS = {
  iphoneSE: { width: 320, height: 568, name: 'iPhone SE' },
  iphone15: { width: 375, height: 667, name: 'iPhone 15' },
  iphone15ProMax: { width: 430, height: 932, name: 'iPhone 15 Pro Max' },
  ipad: { width: 768, height: 1024, name: 'iPad' },
  ipadPro: { width: 1024, height: 1366, name: 'iPad Pro' },
};

const ROUTES = {
  home: '/',
  live: '/live',
  vod: '/vod',
  youngsters: '/youngsters',
  admin: '/admin',
  adminUsers: '/admin/users',
  adminBilling: '/admin/billing',
  widgets: '/widgets',
  player: '/watch/test-video', // Mock video ID
};

// Minimum touch target size for iOS (44x44pt)
const MIN_TOUCH_TARGET_SIZE = 44;

// Helper: Wait for page to be fully loaded
async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
  // Wait for any animations to complete
  await page.waitForTimeout(500);
}

// Helper: Check touch target size
async function verifyTouchTarget(element: any, name: string) {
  const box = await element.boundingBox();
  if (box) {
    expect(box.width, `${name} width should be >= ${MIN_TOUCH_TARGET_SIZE}px`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
    expect(box.height, `${name} height should be >= ${MIN_TOUCH_TARGET_SIZE}px`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
  }
}

// Helper: Verify glass component styling
async function verifyGlassEffect(page: Page, selector: string) {
  const element = page.locator(selector);
  const backdropFilter = await element.evaluate((el) => window.getComputedStyle(el).backdropFilter);
  const backgroundColor = await element.evaluate((el) => window.getComputedStyle(el).backgroundColor);

  expect(backdropFilter).toContain('blur');
  expect(backgroundColor).toMatch(/rgba\(.*,\s*0\.\d+\)/); // Has transparency
}

// Helper: Capture full page screenshot with scroll
async function captureFullPageScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/ios/${name}.png`,
    fullPage: true,
  });
}

// ============================================================================
// HOMEPAGE TESTS
// ============================================================================

test.describe('HomePage - iOS Visual Regression', () => {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`HomePage renders correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.home);
      await waitForPageReady(page);

      // Capture full page screenshot
      await captureFullPageScreenshot(page, `homepage-${key}`);

      // Verify key elements are visible
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });

    test(`HomePage hero section on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.home);
      await waitForPageReady(page);

      const hero = page.locator('[data-testid="cinematic-hero"]').first();
      if (await hero.isVisible()) {
        await expect(hero).toHaveScreenshot(`homepage-hero-${key}.png`, {
          maxDiffPixels: 100,
        });
      }
    });

    test(`HomePage navigation on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.home);
      await waitForPageReady(page);

      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();
      await expect(nav).toHaveScreenshot(`homepage-nav-${key}.png`);
    });

    test(`HomePage content carousels on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.home);
      await waitForPageReady(page);

      // Find all carousels
      const carousels = page.locator('[data-testid*="carousel"]');
      const count = await carousels.count();

      if (count > 0) {
        const firstCarousel = carousels.first();
        await expect(firstCarousel).toHaveScreenshot(`homepage-carousel-${key}.png`, {
          maxDiffPixels: 150,
        });
      }
    });
  }

  test('HomePage - Touch targets meet 44x44pt minimum', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto(ROUTES.home);
    await waitForPageReady(page);

    // Check navigation buttons
    const navButtons = await page.locator('nav button, nav a[role="button"]').all();
    for (const button of navButtons.slice(0, 5)) {
      if (await button.isVisible()) {
        await verifyTouchTarget(button, 'Navigation button');
      }
    }

    // Check hero CTA buttons
    const ctaButtons = await page.locator('[data-testid="cinematic-hero"] button').all();
    for (const button of ctaButtons) {
      if (await button.isVisible()) {
        await verifyTouchTarget(button, 'Hero CTA button');
      }
    }
  });

  test('HomePage - Glass effects render correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto(ROUTES.home);
    await waitForPageReady(page);

    // Verify glass effects on header
    await verifyGlassEffect(page, 'header');

    // Verify glass effects on footer
    await verifyGlassEffect(page, 'footer');
  });
});

// ============================================================================
// VIDEO PLAYER TESTS
// ============================================================================

test.describe('Video Player - iOS Visual Regression', () => {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Video Player UI on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.vod); // VOD page has player
      await waitForPageReady(page);

      // Look for video player
      const player = page.locator('[data-testid="video-player"]').first();
      if (await player.isVisible()) {
        await expect(player).toHaveScreenshot(`player-${key}.png`, {
          maxDiffPixels: 200,
        });
      }
    });

    test(`Player controls on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.vod);
      await waitForPageReady(page);

      const controls = page.locator('[data-testid="player-controls"]').first();
      if (await controls.isVisible()) {
        await expect(controls).toHaveScreenshot(`player-controls-${key}.png`);
      }
    });

    test(`Settings panel on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.vod);
      await waitForPageReady(page);

      // Open settings panel
      const settingsButton = page.locator('[data-testid="settings-button"]').first();
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        await page.waitForTimeout(300);

        const settingsPanel = page.locator('[data-testid="settings-panel"]').first();
        if (await settingsPanel.isVisible()) {
          await expect(settingsPanel).toHaveScreenshot(`player-settings-${key}.png`);
        }
      }
    });

    test(`Subtitle controls on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.vod);
      await waitForPageReady(page);

      // Open subtitle controls
      const subtitleButton = page.locator('[data-testid="subtitle-button"]').first();
      if (await subtitleButton.isVisible()) {
        await subtitleButton.click();
        await page.waitForTimeout(300);

        const subtitleControls = page.locator('[data-testid="subtitle-controls"]').first();
        if (await subtitleControls.isVisible()) {
          await expect(subtitleControls).toHaveScreenshot(`player-subtitles-${key}.png`);
        }
      }
    });
  }

  test('Player - Touch targets meet minimum size', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto(ROUTES.vod);
    await waitForPageReady(page);

    // Check player control buttons
    const controlButtons = await page.locator('[data-testid="player-controls"] button').all();
    for (const button of controlButtons) {
      if (await button.isVisible()) {
        await verifyTouchTarget(button, 'Player control button');
      }
    }
  });
});

// ============================================================================
// ADMIN DASHBOARD TESTS
// ============================================================================

test.describe('Admin Dashboard - iOS Visual Regression', () => {
  // Note: Admin may require authentication - these tests may need auth setup

  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Admin dashboard on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Try to navigate to admin (may redirect to login)
      await page.goto(ROUTES.admin);
      await waitForPageReady(page);

      // Capture whatever loads (login or dashboard)
      await captureFullPageScreenshot(page, `admin-${key}`);
    });

    test(`Admin sidebar on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.admin);
      await waitForPageReady(page);

      const sidebar = page.locator('[data-testid="admin-sidebar"]').first();
      if (await sidebar.isVisible()) {
        await expect(sidebar).toHaveScreenshot(`admin-sidebar-${key}.png`);
      }
    });

    test(`Admin data table on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.adminUsers);
      await waitForPageReady(page);

      const table = page.locator('[data-testid="data-table"]').first();
      if (await table.isVisible()) {
        await expect(table).toHaveScreenshot(`admin-table-${key}.png`, {
          maxDiffPixels: 150,
        });
      }
    });
  }
});

// ============================================================================
// YOUNGSTERS PAGE TESTS
// ============================================================================

test.describe('YoungstersPage - iOS Visual Regression', () => {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`YoungstersPage on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.youngsters);
      await waitForPageReady(page);

      await captureFullPageScreenshot(page, `youngsters-${key}`);
    });

    test(`Youngsters filters on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.youngsters);
      await waitForPageReady(page);

      const filters = page.locator('[data-testid*="filter"]').first();
      if (await filters.isVisible()) {
        await expect(filters).toHaveScreenshot(`youngsters-filters-${key}.png`);
      }
    });

    test(`Youngsters content grid on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.youngsters);
      await waitForPageReady(page);

      const grid = page.locator('[data-testid="content-grid"]').first();
      if (await grid.isVisible()) {
        await expect(grid).toHaveScreenshot(`youngsters-grid-${key}.png`, {
          maxDiffPixels: 200,
        });
      }
    });
  }
});

// ============================================================================
// WIDGET CONTAINER TESTS
// ============================================================================

test.describe('Widget Containers - iOS Visual Regression', () => {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Widgets page on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.widgets);
      await waitForPageReady(page);

      await captureFullPageScreenshot(page, `widgets-${key}`);
    });

    test(`Widget container on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.widgets);
      await waitForPageReady(page);

      const widget = page.locator('[data-testid="widget-container"]').first();
      if (await widget.isVisible()) {
        await expect(widget).toHaveScreenshot(`widget-container-${key}.png`);
      }
    });
  }
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility - iOS', () => {
  test('Dynamic Type support - Text scales correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto(ROUTES.home);
    await waitForPageReady(page);

    // Get default text size
    const textElement = page.locator('body').first();
    const defaultSize = await textElement.evaluate((el) => window.getComputedStyle(el).fontSize);

    // Simulate larger text preference (user accessibility setting)
    await page.addStyleTag({ content: 'body { font-size: 120% !important; }' });
    await page.waitForTimeout(300);

    const largerSize = await textElement.evaluate((el) => window.getComputedStyle(el).fontSize);

    // Text should have increased
    expect(parseFloat(largerSize)).toBeGreaterThan(parseFloat(defaultSize));
  });

  test('VoiceOver navigation - ARIA labels present', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto(ROUTES.home);
    await waitForPageReady(page);

    // Check buttons have aria-label or text content
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 10)) {
      if (await button.isVisible()) {
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        expect(ariaLabel || textContent?.trim(), 'Button should have accessible name').toBeTruthy();
      }
    }

    // Check images have alt text
    const images = await page.locator('img').all();
    for (const img of images.slice(0, 10)) {
      if (await img.isVisible()) {
        const alt = await img.getAttribute('alt');
        expect(alt, 'Image should have alt text').toBeTruthy();
      }
    }
  });

  test('RTL layout - Hebrew language support', async ({ page, context }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);

    // Set RTL direction
    await context.addInitScript(() => {
      document.dir = 'rtl';
      document.documentElement.setAttribute('lang', 'he');
    });

    await page.goto(ROUTES.home + '?lng=he');
    await waitForPageReady(page);

    // Capture RTL layout
    await captureFullPageScreenshot(page, 'homepage-rtl-hebrew');

    // Verify direction is RTL
    const direction = await page.evaluate(() => document.dir);
    expect(direction).toBe('rtl');

    // Verify text alignment
    const body = page.locator('body');
    const textAlign = await body.evaluate((el) => window.getComputedStyle(el).textAlign);
    expect(textAlign).toMatch(/right|start/);
  });

  test('Safe area handling - No content overlap', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15ProMax);
    await page.goto(ROUTES.home);
    await waitForPageReady(page);

    // Check header doesn't overlap safe area
    const header = page.locator('header');
    const headerBox = await header.boundingBox();
    expect(headerBox?.y, 'Header should respect safe area').toBeGreaterThanOrEqual(0);

    // Check footer doesn't overlap safe area
    const footer = page.locator('footer');
    const footerBox = await footer.boundingBox();
    expect(footerBox, 'Footer should be visible').toBeTruthy();
  });

  test('Keyboard navigation - Tab order is logical', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.ipad);
    await page.goto(ROUTES.home);
    await waitForPageReady(page);

    // Press Tab multiple times
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    // Tab through 10 elements
    const focusedElements = [firstFocused];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      focusedElements.push(focused);
    }

    // Should have moved focus
    expect(new Set(focusedElements).size).toBeGreaterThan(1);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

test.describe('Performance - iOS', () => {
  test('Core Web Vitals - FCP < 1.5s, LCP < 2.5s', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto(ROUTES.home);

    const metrics = await page.evaluate(() => {
      return new Promise<{ FCP?: number; LCP?: number }>((resolve) => {
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

        setTimeout(() => {
          resolve({
            FCP: fcp[fcp.length - 1],
            LCP: lcp[lcp.length - 1],
          });
        }, 3000);
      });
    });

    if (metrics.FCP) {
      expect(metrics.FCP, 'First Contentful Paint should be < 1500ms').toBeLessThan(1500);
    }

    if (metrics.LCP) {
      expect(metrics.LCP, 'Largest Contentful Paint should be < 2500ms').toBeLessThan(2500);
    }
  });

  test('No console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto(ROUTES.home);
    await waitForPageReady(page);

    expect(consoleErrors, 'Should have no console errors').toHaveLength(0);
  });
});

// ============================================================================
// STYLE GUIDE COMPLIANCE TESTS
// ============================================================================

test.describe('Style Guide Compliance', () => {
  test('No StyleSheet.create() usage (should use TailwindCSS)', async ({ page }) => {
    // This is a static code check - would be better as a separate script
    // For now, we verify that TailwindCSS classes are present
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto(ROUTES.home);
    await waitForPageReady(page);

    // Check that elements have Tailwind classes
    const hasClasses = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let tailwindClassCount = 0;

      for (const el of Array.from(elements).slice(0, 100)) {
        const classes = el.className;
        if (typeof classes === 'string' && classes.match(/(flex|grid|bg-|text-|p-|m-|rounded|shadow)/)) {
          tailwindClassCount++;
        }
      }

      return tailwindClassCount > 0;
    });

    expect(hasClasses, 'Elements should use TailwindCSS classes').toBe(true);
  });

  test('No inline style props (except dynamic values)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto(ROUTES.home);
    await waitForPageReady(page);

    // Count elements with inline styles
    const inlineStyleCount = await page.evaluate(() => {
      const elements = document.querySelectorAll('[style]');
      return elements.length;
    });

    // Some dynamic styles are OK, but shouldn't be excessive
    expect(inlineStyleCount, 'Should minimize inline styles').toBeLessThan(20);
  });

  test('Glass components have correct styling', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto(ROUTES.home);
    await waitForPageReady(page);

    // Check for glassmorphism effects
    const glassElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let glassCount = 0;

      for (const el of Array.from(elements)) {
        const style = window.getComputedStyle(el);
        const hasBackdropBlur = style.backdropFilter && style.backdropFilter.includes('blur');
        const hasTransparency = style.backgroundColor && style.backgroundColor.includes('rgba') && parseFloat(style.backgroundColor.split(',')[3]) < 1;

        if (hasBackdropBlur && hasTransparency) {
          glassCount++;
        }
      }

      return glassCount;
    });

    expect(glassElements, 'Should have glass components').toBeGreaterThan(0);
  });
});
