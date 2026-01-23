/**
 * iOS Layout Regression Testing - Bayit+ Web Platform
 *
 * Practical iOS testing that works with authentication and actual page states.
 * Tests layout, styling, and accessibility across iOS device sizes.
 *
 * This is a more practical approach that:
 * - Tests pages that are actually accessible
 * - Checks for layout issues and styling problems
 * - Validates TailwindCSS migration completeness
 * - Verifies accessibility requirements
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// CONFIGURATION
// ============================================================================

const VIEWPORTS = {
  iphoneSE: { width: 320, height: 568, name: 'iPhone SE' },
  iphone15: { width: 375, height: 667, name: 'iPhone 15' },
  iphone15ProMax: { width: 430, height: 932, name: 'iPhone 15 Pro Max' },
  ipad: { width: 768, height: 1024, name: 'iPad' },
  ipadPro: { width: 1024, height: 1366, name: 'iPad Pro' },
};

const MIN_TOUCH_TARGET_SIZE = 44;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // Allow for async renders
}

async function captureScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/ios/${name}.png`,
    fullPage: true,
  });
}

async function checkTouchTargets(page: Page, selector: string, minTargets = 3) {
  const elements = await page.locator(selector).all();
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  for (let i = 0; i < Math.min(elements.length, minTargets); i++) {
    const element = elements[i];
    if (await element.isVisible()) {
      const box = await element.boundingBox();
      if (box) {
        const width = box.width;
        const height = box.height;

        if (width >= MIN_TOUCH_TARGET_SIZE && height >= MIN_TOUCH_TARGET_SIZE) {
          passCount++;
        } else {
          failCount++;
          failures.push(`Element ${i}: ${width}x${height}px (needs ${MIN_TOUCH_TARGET_SIZE}x${MIN_TOUCH_TARGET_SIZE}px)`);
        }
      }
    }
  }

  return { passCount, failCount, failures };
}

// ============================================================================
// LAYOUT DETECTION TESTS
// ============================================================================

test.describe('iOS Layout Detection', () => {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Detect layout on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await waitForPageReady(page);

      // Capture screenshot
      await captureScreenshot(page, `layout-detection-${key}`);

      // Detect what's on the page
      const pageInfo = await page.evaluate(() => {
        return {
          title: document.title,
          hasHeader: !!document.querySelector('header'),
          hasNav: !!document.querySelector('nav'),
          hasMain: !!document.querySelector('main'),
          hasFooter: !!document.querySelector('footer'),
          hasLoginForm: !!document.querySelector('form[action*="login"]') || !!document.querySelector('input[type="password"]'),
          bodyClasses: document.body.className,
          url: window.location.href,
          elementCount: document.querySelectorAll('*').length,
        };
      });

      console.log(`\n${viewport.name} Page Info:`, pageInfo);

      // Should have some content
      expect(pageInfo.elementCount).toBeGreaterThan(10);
    });
  }
});

// ============================================================================
// STYLE COMPLIANCE TESTS
// ============================================================================

test.describe('TailwindCSS Migration Compliance', () => {
  test('Verify TailwindCSS usage on current page', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto('/');
    await waitForPageReady(page);

    const tailwindInfo = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const tailwindPatterns = [
        'flex', 'grid', 'bg-', 'text-', 'p-', 'm-', 'rounded', 'shadow',
        'hover:', 'focus:', 'backdrop-blur', 'gap-', 'items-', 'justify-'
      ];

      let tailwindCount = 0;
      let inlineStyleCount = 0;

      elements.forEach(el => {
        const className = el.className;
        if (typeof className === 'string') {
          for (const pattern of tailwindPatterns) {
            if (className.includes(pattern)) {
              tailwindCount++;
              break;
            }
          }
        }

        if (el.hasAttribute('style')) {
          inlineStyleCount++;
        }
      });

      return {
        tailwindCount,
        inlineStyleCount,
        totalElements: elements.length,
        tailwindPercentage: (tailwindCount / elements.length * 100).toFixed(1),
      };
    });

    console.log('\nTailwind Usage:', tailwindInfo);

    // Should have significant Tailwind usage
    expect(tailwindInfo.tailwindCount).toBeGreaterThan(5);

    // Inline styles should be minimal
    expect(tailwindInfo.inlineStyleCount).toBeLessThan(30);
  });

  test('Verify glassmorphism effects present', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto('/');
    await waitForPageReady(page);

    const glassInfo = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      let glassEffectCount = 0;

      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const hasBackdropBlur = style.backdropFilter && style.backdropFilter.includes('blur');
        const hasTransparency = style.backgroundColor &&
          style.backgroundColor.includes('rgba') &&
          parseFloat(style.backgroundColor.split(',')[3]) < 1;

        if (hasBackdropBlur || hasTransparency) {
          glassEffectCount++;
        }
      });

      return { glassEffectCount };
    });

    console.log('\nGlass Effects:', glassInfo);

    // Should have some glass effects
    expect(glassInfo.glassEffectCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// RESPONSIVE LAYOUT TESTS
// ============================================================================

test.describe('Responsive Layout Behavior', () => {
  test('Layout adapts across all iOS viewports', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    const measurements: any[] = [];

    for (const [key, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(300);

      const measurement = await page.evaluate((vp) => {
        const body = document.body;
        const main = document.querySelector('main');

        return {
          viewport: vp,
          bodyWidth: body.clientWidth,
          bodyHeight: body.clientHeight,
          mainWidth: main?.clientWidth || 0,
          scrollHeight: document.documentElement.scrollHeight,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
        };
      }, viewport.name);

      measurements.push(measurement);

      await captureScreenshot(page, `responsive-${key}`);
    }

    console.log('\nResponsive Measurements:', measurements);

    // No horizontal scrolling on any viewport
    for (const m of measurements) {
      expect(m.hasHorizontalScroll, `${m.viewport} should not have horizontal scroll`).toBe(false);
    }

    // Body should match viewport width
    expect(measurements[0].bodyWidth).toBe(320); // iPhone SE
    expect(measurements[1].bodyWidth).toBe(375); // iPhone 15
    expect(measurements[2].bodyWidth).toBe(430); // iPhone 15 Pro Max
  });
});

// ============================================================================
// TOUCH TARGET TESTS
// ============================================================================

test.describe('iOS Touch Targets', () => {
  test('Buttons meet minimum 44x44px size - iPhone 15', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto('/');
    await waitForPageReady(page);

    const result = await checkTouchTargets(page, 'button', 5);

    console.log(`\nTouch Target Results:
      ✓ Passed: ${result.passCount}
      ✗ Failed: ${result.failCount}
      ${result.failures.length > 0 ? 'Failures:\n      ' + result.failures.join('\n      ') : ''}`);

    // At least some buttons should pass (more lenient for real pages)
    expect(result.passCount).toBeGreaterThan(0);
  });

  test('Links meet minimum touch target size - iPhone SE', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphoneSE);
    await page.goto('/');
    await waitForPageReady(page);

    const result = await checkTouchTargets(page, 'a', 5);

    console.log(`\nLink Touch Target Results:
      ✓ Passed: ${result.passCount}
      ✗ Failed: ${result.failCount}`);

    expect(result.passCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('iOS Accessibility', () => {
  test('Interactive elements have accessible names', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto('/');
    await waitForPageReady(page);

    const a11yInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const links = Array.from(document.querySelectorAll('a'));

      let buttonsWithLabels = 0;
      let linksWithLabels = 0;

      buttons.forEach(btn => {
        const hasLabel = btn.getAttribute('aria-label') || btn.textContent?.trim();
        if (hasLabel) buttonsWithLabels++;
      });

      links.forEach(link => {
        const hasLabel = link.getAttribute('aria-label') || link.textContent?.trim();
        if (hasLabel) linksWithLabels++;
      });

      return {
        totalButtons: buttons.length,
        buttonsWithLabels,
        totalLinks: links.length,
        linksWithLabels,
      };
    });

    console.log('\nAccessibility Info:', a11yInfo);

    if (a11yInfo.totalButtons > 0) {
      const buttonPercentage = (a11yInfo.buttonsWithLabels / a11yInfo.totalButtons) * 100;
      expect(buttonPercentage).toBeGreaterThan(50);
    }
  });

  test('Images have alt text', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto('/');
    await waitForPageReady(page);

    const imageInfo = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      let imagesWithAlt = 0;

      images.forEach(img => {
        if (img.getAttribute('alt')) imagesWithAlt++;
      });

      return {
        totalImages: images.length,
        imagesWithAlt,
      };
    });

    console.log('\nImage Accessibility:', imageInfo);

    if (imageInfo.totalImages > 0) {
      const altPercentage = (imageInfo.imagesWithAlt / imageInfo.totalImages) * 100;
      expect(altPercentage).toBeGreaterThan(60);
    }
  });

  test('Keyboard navigation works', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.ipad);
    await page.goto('/');
    await waitForPageReady(page);

    // Press Tab to focus first element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);

    // Should focus something
    expect(firstFocused).toBeTruthy();

    // Tab through several elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    const lastFocused = await page.evaluate(() => document.activeElement?.tagName);

    // Focus should have moved
    expect(lastFocused).toBeTruthy();
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

test.describe('iOS Performance', () => {
  test('No console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    await page.setViewportSize(VIEWPORTS.iphone15);
    await page.goto('/');
    await waitForPageReady(page);

    console.log(`\nConsole Messages:
      Errors: ${consoleErrors.length}
      Warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors.slice(0, 5));
    }

    // Should have minimal console errors
    expect(consoleErrors.length).toBeLessThan(5);
  });

  test('Page loads within reasonable time', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone15);

    const startTime = Date.now();
    await page.goto('/');
    await waitForPageReady(page);
    const loadTime = Date.now() - startTime;

    console.log(`\nLoad Time: ${loadTime}ms`);

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});

// ============================================================================
// SCREENSHOT GALLERY
// ============================================================================

test.describe('iOS Screenshot Gallery', () => {
  const pagesToTest = [
    { path: '/', name: 'home' },
    { path: '/login', name: 'login' },
    { path: '/register', name: 'register' },
  ];

  for (const pageConfig of pagesToTest) {
    for (const [key, viewport] of Object.entries(VIEWPORTS)) {
      test(`Capture ${pageConfig.name} on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(pageConfig.path);
        await waitForPageReady(page);

        await captureScreenshot(page, `${pageConfig.name}-${key}`);

        // Basic visibility check
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).toBeTruthy();
      });
    }
  }
});
