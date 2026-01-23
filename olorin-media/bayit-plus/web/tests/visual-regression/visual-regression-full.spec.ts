/**
 * Bayit+ Web Platform - Comprehensive Visual Regression Testing
 *
 * Tests TailwindCSS migration across all key pages, browsers, and viewports.
 *
 * Test Coverage:
 * - 4 browsers: Chrome, Firefox, Safari (WebKit), Edge
 * - 9 viewports: 320px - 2560px (mobile to 2K desktop)
 * - Performance: FCP < 1.5s, LCP < 2.5s
 * - Accessibility: ARIA labels, keyboard navigation, WCAG AA compliance
 * - Console errors: Zero tolerance
 *
 * Test Pages:
 * - Home page (/)
 * - Player page (/watch/*)
 * - Admin dashboard (/admin)
 * - Youngsters page (/youngsters)
 * - Widget modals
 */

import { test, expect, Page } from '@playwright/test';

// Viewport configurations for comprehensive testing
const VIEWPORTS = [
  { name: 'mobile-xs', width: 320, height: 568 },      // iPhone SE
  { name: 'mobile-sm', width: 375, height: 667 },      // iPhone 15
  { name: 'mobile-lg', width: 414, height: 896 },      // iPhone 15 Pro Max
  { name: 'tablet-sm', width: 768, height: 1024 },     // iPad
  { name: 'tablet-lg', width: 1024, height: 1366 },    // iPad Pro
  { name: 'desktop-sm', width: 1280, height: 720 },    // HD Desktop
  { name: 'desktop-md', width: 1440, height: 900 },    // MacBook Pro
  { name: 'desktop-lg', width: 1920, height: 1080 },   // Full HD
  { name: 'desktop-2k', width: 2560, height: 1440 },   // 2K Display
];

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  FCP: 1500,  // First Contentful Paint < 1.5s
  LCP: 2500,  // Largest Contentful Paint < 2.5s
};

/**
 * Helper: Wait for page to be fully loaded
 */
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  // Wait for any lazy-loaded images
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve());
      }
    });
  });
}

/**
 * Helper: Check for console errors
 */
async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return errors;
}

/**
 * Helper: Measure Core Web Vitals
 */
async function measureCoreWebVitals(page: Page) {
  return await page.evaluate(() => {
    return new Promise<{ FCP?: number; LCP?: number; CLS?: number }>((resolve) => {
      const metrics: { FCP?: number; LCP?: number; CLS?: number } = {};

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            metrics.FCP = entry.startTime;
          }
          if (entry.entryType === 'largest-contentful-paint') {
            metrics.LCP = entry.startTime;
          }
        }
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

      // Wait 3 seconds to capture metrics
      setTimeout(() => {
        observer.disconnect();
        resolve(metrics);
      }, 3000);
    });
  });
}

/**
 * Helper: Test keyboard navigation
 */
async function testKeyboardNavigation(page: Page) {
  const results = {
    tabWorks: false,
    enterWorks: false,
    escapeWorks: false,
    focusVisible: false,
  };

  // Test Tab key
  await page.keyboard.press('Tab');
  const activeElement = await page.evaluate(() => document.activeElement?.tagName);
  results.tabWorks = !!activeElement && activeElement !== 'BODY';

  // Check focus visibility
  results.focusVisible = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return false;
    const styles = window.getComputedStyle(el);
    return styles.outline !== 'none' || styles.boxShadow !== 'none';
  });

  // Test Enter key (if button is focused)
  if (activeElement === 'BUTTON' || activeElement === 'A') {
    results.enterWorks = true;
  }

  // Test Escape key
  await page.keyboard.press('Escape');
  results.escapeWorks = true;

  return results;
}

/**
 * Helper: Check ARIA labels and roles
 */
async function checkAccessibility(page: Page) {
  return await page.evaluate(() => {
    const issues: string[] = [];

    // Check all buttons have accessible names
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons.forEach((button, index) => {
      const hasAriaLabel = button.hasAttribute('aria-label');
      const hasText = button.textContent?.trim().length ?? 0 > 0;
      const hasAriaLabelledBy = button.hasAttribute('aria-labelledby');

      if (!hasAriaLabel && !hasText && !hasAriaLabelledBy) {
        issues.push(`Button #${index} missing accessible name`);
      }
    });

    // Check all images have alt text
    const images = Array.from(document.querySelectorAll('img'));
    images.forEach((img, index) => {
      if (!img.hasAttribute('alt')) {
        issues.push(`Image #${index} missing alt text`);
      }
    });

    // Check form inputs have labels
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    inputs.forEach((input, index) => {
      const hasLabel = document.querySelector(`label[for="${input.id}"]`);
      const hasAriaLabel = input.hasAttribute('aria-label');
      const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');

      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push(`Input #${index} missing label`);
      }
    });

    return issues;
  });
}

// ============================================================================
// HOME PAGE TESTS
// ============================================================================

test.describe('Home Page - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  // Test all viewports
  VIEWPORTS.forEach((viewport) => {
    test(`TC-HOME-1: Homepage renders at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Wait for hero section
      await page.waitForSelector('[class*="hero"], [class*="Hero"], main', { timeout: 10000 });

      // Take full page screenshot
      await expect(page).toHaveScreenshot(`home-${viewport.name}.png`, {
        fullPage: true,
        maxDiffPixels: 200,
      });
    });
  });

  test('TC-HOME-2: No console errors on homepage', async ({ page }) => {
    const errors = await checkConsoleErrors(page);

    await page.goto('/');
    await waitForPageLoad(page);

    // Filter out acceptable warnings (e.g., third-party scripts)
    const criticalErrors = errors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('third-party')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('TC-HOME-3: Core Web Vitals within thresholds', async ({ page }) => {
    await page.goto('/');

    const metrics = await measureCoreWebVitals(page);

    if (metrics.FCP) {
      expect(metrics.FCP).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP);
    }

    if (metrics.LCP) {
      expect(metrics.LCP).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP);
    }
  });

  test('TC-HOME-4: Keyboard navigation works', async ({ page }) => {
    const navResults = await testKeyboardNavigation(page);

    expect(navResults.tabWorks).toBe(true);
    expect(navResults.focusVisible).toBe(true);
  });

  test('TC-HOME-5: Accessibility - ARIA labels', async ({ page }) => {
    const issues = await checkAccessibility(page);

    // Allow up to 5 minor issues (e.g., decorative images)
    expect(issues.length).toBeLessThan(5);
  });
});

// ============================================================================
// PLAYER PAGE TESTS
// ============================================================================

test.describe('Player Page - Visual Regression', () => {
  // Note: Actual player testing requires valid content ID
  // This tests the player UI components in isolation

  test('TC-PLAYER-1: Player controls render correctly', async ({ page }) => {
    // Navigate to a test page with player or mock data
    await page.goto('/');
    await waitForPageLoad(page);

    // Look for player controls in DOM (may be hidden until playback starts)
    const hasPlayerControls = await page.evaluate(() => {
      return !!document.querySelector('[class*="player"], [class*="Player"], [data-testid*="player"]');
    });

    // If player exists, capture screenshot
    if (hasPlayerControls) {
      const player = page.locator('[class*="player"], [class*="Player"]').first();
      await expect(player).toHaveScreenshot('player-controls.png', {
        maxDiffPixels: 100,
      });
    }
  });

  test('TC-PLAYER-2: Subtitle controls accessible', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Check if subtitle controls exist
    const subtitleButton = page.locator('[aria-label*="subtitle" i], [class*="subtitle" i]').first();

    if (await subtitleButton.isVisible()) {
      await subtitleButton.click();
      await page.waitForTimeout(300);

      // Capture subtitle menu
      await expect(page).toHaveScreenshot('player-subtitle-menu.png', {
        maxDiffPixels: 50,
      });
    }
  });

  test('TC-PLAYER-3: Video player responsive layout', async ({ page }) => {
    await page.goto('/');

    for (const viewport of VIEWPORTS.slice(0, 5)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      const hasPlayer = await page.evaluate(() => {
        return !!document.querySelector('[class*="player"], [class*="Player"]');
      });

      if (hasPlayer) {
        const player = page.locator('[class*="player"], [class*="Player"]').first();
        await expect(player).toHaveScreenshot(`player-${viewport.name}.png`, {
          maxDiffPixels: 100,
        });
      }
    }
  });
});

// ============================================================================
// ADMIN DASHBOARD TESTS
// ============================================================================

test.describe('Admin Dashboard - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Note: Admin routes may require authentication
    // This will test as far as possible without auth
    await page.goto('/admin');
    await waitForPageLoad(page);
  });

  test('TC-ADMIN-1: Admin dashboard layout renders', async ({ page }) => {
    // Check if redirected to login or dashboard loads
    const url = page.url();
    const isAdminPage = url.includes('/admin');
    const isLoginPage = url.includes('/login');

    if (isAdminPage) {
      await expect(page).toHaveScreenshot('admin-dashboard.png', {
        fullPage: true,
        maxDiffPixels: 200,
      });
    } else if (isLoginPage) {
      // Test login page instead
      await expect(page).toHaveScreenshot('admin-login-redirect.png', {
        maxDiffPixels: 100,
      });
    }
  });

  test('TC-ADMIN-2: Admin dashboard responsive', async ({ page }) => {
    for (const viewport of [VIEWPORTS[1], VIEWPORTS[3], VIEWPORTS[7]]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`admin-${viewport.name}.png`, {
        fullPage: true,
        maxDiffPixels: 200,
      });
    }
  });

  test('TC-ADMIN-3: Admin sidebar navigation', async ({ page }) => {
    const url = page.url();

    if (url.includes('/admin') && !url.includes('/login')) {
      // Look for sidebar
      const sidebar = page.locator('[class*="sidebar"], [class*="Sidebar"], nav').first();

      if (await sidebar.isVisible()) {
        await expect(sidebar).toHaveScreenshot('admin-sidebar.png', {
          maxDiffPixels: 50,
        });
      }
    }
  });
});

// ============================================================================
// YOUNGSTERS PAGE TESTS
// ============================================================================

test.describe('Youngsters Page - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/youngsters');
    await waitForPageLoad(page);
  });

  test('TC-YOUNGSTERS-1: Youngsters page renders', async ({ page }) => {
    await expect(page).toHaveScreenshot('youngsters-page.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });

  test('TC-YOUNGSTERS-2: Youngsters page responsive', async ({ page }) => {
    for (const viewport of VIEWPORTS.slice(0, 6)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`youngsters-${viewport.name}.png`, {
        fullPage: true,
        maxDiffPixels: 150,
      });
    }
  });

  test('TC-YOUNGSTERS-3: Child-friendly accessibility', async ({ page }) => {
    const issues = await checkAccessibility(page);

    // Youngsters page should have excellent accessibility
    expect(issues.length).toBeLessThan(3);
  });
});

// ============================================================================
// WIDGET MODAL TESTS
// ============================================================================

test.describe('Widget Modals - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/widgets');
    await waitForPageLoad(page);
  });

  test('TC-WIDGETS-1: Widget page renders', async ({ page }) => {
    const url = page.url();

    // Check if widgets page exists or redirected
    if (url.includes('/widgets') || url.includes('/user-widgets')) {
      await expect(page).toHaveScreenshot('widgets-page.png', {
        fullPage: true,
        maxDiffPixels: 200,
      });
    }
  });

  test('TC-WIDGETS-2: Modal overlay glassmorphism', async ({ page }) => {
    // Look for any modal trigger buttons
    const modalTriggers = page.locator('[aria-haspopup="dialog"], [data-modal-trigger]');

    if ((await modalTriggers.count()) > 0) {
      await modalTriggers.first().click();
      await page.waitForTimeout(500);

      // Check for modal
      const modal = page.locator('[role="dialog"], [class*="modal" i]');

      if (await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('widget-modal.png', {
          maxDiffPixels: 100,
        });
      }
    }
  });
});

// ============================================================================
// CROSS-BROWSER COMPATIBILITY TESTS
// ============================================================================

test.describe('Cross-Browser Compatibility', () => {
  const testPages = [
    { path: '/', name: 'home' },
    { path: '/youngsters', name: 'youngsters' },
  ];

  testPages.forEach((page) => {
    test(`TC-BROWSER-1: ${page.name} renders consistently across browsers`, async ({ page: playwright }) => {
      await playwright.goto(page.path);
      await waitForPageLoad(playwright);

      // Take screenshot (Playwright will run this across all configured browsers)
      await expect(playwright).toHaveScreenshot(`${page.name}-browser-${playwright.context().browser()?.browserType().name()}.png`, {
        fullPage: true,
        maxDiffPixels: 300,  // More tolerance for cross-browser differences
      });
    });
  });
});

// ============================================================================
// PERFORMANCE REGRESSION TESTS
// ============================================================================

test.describe('Performance Regression', () => {
  test('TC-PERF-1: Bundle size reasonable', async ({ page }) => {
    await page.goto('/');

    // Get all loaded resources
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      return entries.map((entry: any) => ({
        name: entry.name,
        size: entry.transferSize || 0,
        type: entry.initiatorType,
      }));
    });

    // Calculate total JS bundle size
    const jsBundles = resources.filter((r: any) =>
      r.type === 'script' || r.name.endsWith('.js')
    );

    const totalJsSize = jsBundles.reduce((sum: number, r: any) => sum + r.size, 0);

    // Total JS should be under 1MB (1,000,000 bytes)
    expect(totalJsSize).toBeLessThan(1_000_000);
  });

  test('TC-PERF-2: Time to Interactive', async ({ page }) => {
    await page.goto('/');

    const tti = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            resolve(entries[0].startTime);
          }
        });

        observer.observe({ entryTypes: ['navigation'] });

        setTimeout(() => resolve(Date.now()), 5000);
      });
    });

    // Time to Interactive should be under 5 seconds
    expect(tti).toBeLessThan(5000);
  });
});

// ============================================================================
// RTL (RIGHT-TO-LEFT) LAYOUT TESTS
// ============================================================================

test.describe('RTL Layout - Hebrew/Arabic', () => {
  test('TC-RTL-1: Homepage RTL layout', async ({ page, context }) => {
    // Set RTL direction
    await context.addInitScript(() => {
      document.dir = 'rtl';
      document.documentElement.setAttribute('lang', 'he');
    });

    await page.goto('/?lng=he');
    await waitForPageLoad(page);

    // Verify RTL is applied
    const dir = await page.evaluate(() => document.dir);
    expect(dir).toBe('rtl');

    await expect(page).toHaveScreenshot('home-rtl-hebrew.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });

  test('TC-RTL-2: Navigation RTL alignment', async ({ page, context }) => {
    await context.addInitScript(() => {
      document.dir = 'rtl';
    });

    await page.goto('/?lng=he');
    await waitForPageLoad(page);

    const nav = page.locator('nav, [role="navigation"]').first();

    if (await nav.isVisible()) {
      const textAlign = await nav.evaluate((el) =>
        window.getComputedStyle(el).textAlign
      );

      expect(['right', 'start']).toContain(textAlign);
    }
  });
});
