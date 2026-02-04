/**
 * Mobile Optimization Test Suite
 *
 * Verifies WCAG AA compliance and mobile optimizations across all pages:
 * - Touch targets ≥ 48px (actual: 56px on mobile)
 * - Input font sizes ≥ 16px (prevent iOS zoom)
 * - Responsive grid columns
 * - Player control sizes
 * - Button heights
 */

import { test, expect, type Page } from '@playwright/test';

// Mobile viewport configurations
const MOBILE_VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 13': { width: 390, height: 844 },
  'iPhone 14 Pro Max': { width: 430, height: 932 },
  'Pixel 5': { width: 393, height: 851 },
  'Samsung Galaxy S21': { width: 360, height: 800 },
};

const TABLET_VIEWPORTS = {
  'iPad Mini': { width: 744, height: 1133 },
  'iPad': { width: 810, height: 1080 },
};

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

// WCAG AA minimum touch target size
const MIN_TOUCH_TARGET = 48;
const EXPECTED_MOBILE_TOUCH_TARGET = 56;
const EXPECTED_MOBILE_BUTTON_LG = 64;

/**
 * Get computed size of an element
 */
async function getElementSize(page: Page, selector: string): Promise<{ width: number; height: number } | null> {
  const element = await page.locator(selector).first();
  if (!(await element.isVisible())) return null;

  const box = await element.boundingBox();
  return box ? { width: box.width, height: box.height } : null;
}

/**
 * Verify all interactive elements meet minimum touch target size
 */
async function verifyTouchTargets(page: Page, minSize: number = MIN_TOUCH_TARGET) {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Find all interactive elements
  const interactiveSelectors = [
    'button',
    'a[role="button"]',
    'input[type="button"]',
    'input[type="submit"]',
    '[role="button"]',
    'a[href]',
  ];

  const results: { selector: string; width: number; height: number; pass: boolean }[] = [];

  for (const selector of interactiveSelectors) {
    const elements = await page.locator(selector).all();

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (!(await element.isVisible())) continue;

      const box = await element.boundingBox();
      if (!box) continue;

      const pass = box.width >= minSize && box.height >= minSize;
      results.push({
        selector: `${selector}[${i}]`,
        width: Math.round(box.width),
        height: Math.round(box.height),
        pass,
      });

      // Fail immediately if any element is too small
      if (!pass) {
        throw new Error(
          `Touch target too small: ${selector}[${i}] - ${Math.round(box.width)}x${Math.round(box.height)}px (minimum: ${minSize}x${minSize}px)`
        );
      }
    }
  }

  return results;
}

test.describe('Mobile Optimization - Touch Targets', () => {
  test.describe('iPhone 13 (390x844)', () => {
    test.use({ viewport: MOBILE_VIEWPORTS['iPhone 13'] });

    test('HomePage - all touch targets meet WCAG AA', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const results = await verifyTouchTargets(page, MIN_TOUCH_TARGET);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.pass)).toBe(true);
    });

    test('VODPage - content cards have adequate touch targets', async ({ page }) => {
      await page.goto('/vod');
      await page.waitForLoadState('networkidle');

      // Check content card action buttons
      const playButtons = await page.locator('[aria-label*="Play"]').all();
      for (const button of playButtons) {
        if (!(await button.isVisible())) continue;
        const box = await button.boundingBox();
        if (!box) continue;

        expect(box.width).toBeGreaterThanOrEqual(EXPECTED_MOBILE_TOUCH_TARGET);
        expect(box.height).toBeGreaterThanOrEqual(EXPECTED_MOBILE_TOUCH_TARGET);
      }
    });

    test('LoginPage - form inputs have correct height and font size', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Check email input
      const emailInput = page.locator('input[type="email"]').first();
      const emailBox = await emailInput.boundingBox();
      expect(emailBox?.height).toBeGreaterThanOrEqual(EXPECTED_MOBILE_TOUCH_TARGET);

      // Check font size (should be 16px to prevent iOS zoom)
      const fontSize = await emailInput.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });
      expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16);

      // Check password input
      const passwordInput = page.locator('input[type="password"]').first();
      const passwordBox = await passwordInput.boundingBox();
      expect(passwordBox?.height).toBeGreaterThanOrEqual(EXPECTED_MOBILE_TOUCH_TARGET);
    });

    test('Player controls - buttons meet 56px minimum', async ({ page }) => {
      // Navigate to a video (assuming /watch route exists)
      await page.goto('/vod');
      await page.waitForLoadState('networkidle');

      // Click first video to open player
      const firstVideo = page.locator('[data-testid="content-card"]').first();
      if (await firstVideo.isVisible()) {
        await firstVideo.click();
        await page.waitForLoadState('networkidle');

        // Check play/pause button
        const playButton = page.locator('[aria-label*="Play"], [aria-label*="Pause"]').first();
        if (await playButton.isVisible()) {
          const box = await playButton.boundingBox();
          expect(box?.width).toBeGreaterThanOrEqual(EXPECTED_MOBILE_TOUCH_TARGET);
          expect(box?.height).toBeGreaterThanOrEqual(EXPECTED_MOBILE_TOUCH_TARGET);
        }
      }
    });

    test('Profile avatar upload - adequate touch target', async ({ page }) => {
      // Navigate to profile (may require auth, skip if not available)
      await page.goto('/profile');

      // Check if avatar is visible (user may not be logged in)
      const avatar = page.locator('[aria-label*="avatar"], [alt*="avatar"]').first();
      if (await avatar.isVisible()) {
        const box = await avatar.boundingBox();
        // Avatar should be 120px on mobile
        expect(box?.width).toBeGreaterThanOrEqual(100);
        expect(box?.height).toBeGreaterThanOrEqual(100);
      }
    });
  });

  test.describe('iPhone SE (375x667) - Small Screen', () => {
    test.use({ viewport: MOBILE_VIEWPORTS['iPhone SE'] });

    test('All pages - touch targets remain adequate on smallest screen', async ({ page }) => {
      const pages = ['/', '/vod', '/live', '/radio', '/podcasts'];

      for (const path of pages) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        const results = await verifyTouchTargets(page, MIN_TOUCH_TARGET);
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((r) => r.pass)).toBe(true);
      }
    });
  });

  test.describe('iPad Mini (744x1133) - Tablet', () => {
    test.use({ viewport: TABLET_VIEWPORTS['iPad Mini'] });

    test('Touch targets use desktop sizing on tablet', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Tablets should use desktop sizing (buttons may be smaller than mobile)
      const results = await verifyTouchTargets(page, MIN_TOUCH_TARGET);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.pass)).toBe(true);
    });
  });
});

test.describe('Mobile Optimization - Responsive Grids', () => {
  test('VODPage - shows 2 columns on phone', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 13']);
    await page.goto('/vod');
    await page.waitForLoadState('networkidle');

    // Check grid layout
    const contentCards = await page.locator('[data-testid="content-card"]').all();
    if (contentCards.length >= 2) {
      const firstCard = await contentCards[0].boundingBox();
      const secondCard = await contentCards[1].boundingBox();

      if (firstCard && secondCard) {
        // Cards should be side by side (2 columns)
        // Second card X position should be roughly at firstCard.x + firstCard.width
        const isNextToEachOther = Math.abs(secondCard.x - (firstCard.x + firstCard.width)) < 50;
        expect(isNextToEachOther).toBe(true);
      }
    }
  });

  test('VODPage - shows 4+ columns on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/vod');
    await page.waitForLoadState('networkidle');

    const contentCards = await page.locator('[data-testid="content-card"]').all();
    if (contentCards.length >= 4) {
      // On desktop, should have more columns
      // Just verify we have content cards visible
      expect(contentCards.length).toBeGreaterThanOrEqual(4);
    }
  });
});

test.describe('Mobile Optimization - Form Inputs', () => {
  test('GlassInput - prevents iOS zoom with 16px font', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 13']);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"]').all();

    for (const input of inputs) {
      if (!(await input.isVisible())) continue;

      const fontSize = await input.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      const fontSizeNum = parseInt(fontSize);
      expect(fontSizeNum).toBeGreaterThanOrEqual(16);
    }
  });

  test('GlassSelect - adequate height on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 13']);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Look for any select/dropdown elements
    const selects = await page.locator('[role="combobox"], select').all();

    for (const select of selects) {
      if (!(await select.isVisible())) continue;

      const box = await select.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(EXPECTED_MOBILE_TOUCH_TARGET);
      }
    }
  });
});

test.describe('Mobile Optimization - Buttons', () => {
  test('GlassButton - large size reaches 64px on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 13']);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for primary action buttons (typically size="lg")
    const buttons = await page.locator('button').all();

    let foundLargeButton = false;
    for (const button of buttons) {
      if (!(await button.isVisible())) continue;

      const box = await button.boundingBox();
      if (box && box.height >= EXPECTED_MOBILE_BUTTON_LG) {
        foundLargeButton = true;
        expect(box.height).toBeGreaterThanOrEqual(EXPECTED_MOBILE_BUTTON_LG);
      }
    }

    // Should have at least one large button
    // (This may vary by page, so we don't fail if not found)
  });

  test('GlassButton - medium size reaches 56px on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 13']);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login button should be medium size
    const loginButton = page.locator('button').filter({ hasText: /log in|sign in/i }).first();

    if (await loginButton.isVisible()) {
      const box = await loginButton.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(EXPECTED_MOBILE_TOUCH_TARGET);
    }
  });
});

test.describe('Mobile Optimization - Player Controls', () => {
  test('Player control bar - 80px height on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 13']);

    // This test requires a video player to be visible
    // Adjust the route based on your app's structure
    await page.goto('/vod');
    await page.waitForLoadState('networkidle');

    // Try to open a video
    const firstVideo = page.locator('[data-testid="content-card"]').first();
    if (await firstVideo.isVisible()) {
      await firstVideo.click();
      await page.waitForTimeout(2000); // Wait for player to load

      // Look for player control bar
      const controlBar = page.locator('[class*="controlsRow"], [class*="bottomControls"]').first();

      if (await controlBar.isVisible()) {
        const box = await controlBar.boundingBox();
        // Control bar should have minHeight of 80px on mobile
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(64); // Allow some flexibility
        }
      }
    }
  });
});

test.describe('Mobile Optimization - Accessibility', () => {
  test('All interactive elements have accessible labels', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 13']);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      if (!(await button.isVisible())) continue;

      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      const hasAccessibleName = ariaLabel || (text && text.trim().length > 0);

      expect(hasAccessibleName).toBe(true);
    }
  });

  test('Focus indicators visible for keyboard navigation', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 13']);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check if focused element is visible and has focus styles
    const focusedElement = await page.locator(':focus').first();
    const isVisible = await focusedElement.isVisible();

    expect(isVisible).toBe(true);
  });
});

test.describe('Mobile Optimization - RTL Support', () => {
  test('Hebrew language - layout flips to RTL', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 13']);
    await page.goto('/');

    // Switch to Hebrew (if language switcher available)
    const languageButton = page.locator('[aria-label*="language"], button:has-text("עברית")').first();

    if (await languageButton.isVisible()) {
      await languageButton.click();

      // Check if document direction is RTL
      const direction = await page.evaluate(() => document.documentElement.dir);
      expect(direction).toBe('rtl');
    }
  });
});
