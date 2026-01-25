/**
 * Subscribe Page - Premium Features Showcase E2E Tests
 * Tests for full width, localization, and interactive elements
 */

import { test, expect } from '@playwright/test';

test.describe('Premium Features Showcase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/subscribe');
    await page.waitForLoadState('networkidle');
  });

  test('should render Premium Features Showcase section', async ({ page }) => {
    // Check if showcase section exists
    const showcase = page.locator('[data-testid="premium-showcase"]').first();
    await expect(showcase).toBeVisible();
  });

  test('should have full width matching comparison table', async ({ page }) => {
    // Get comparison table width
    const comparisonTable = page.locator('text=Compare Plans').locator('..').locator('..');
    const tableBox = await comparisonTable.boundingBox();

    // Get showcase section width
    const showcase = page.locator('[data-testid="premium-showcase"]').first();
    const showcaseBox = await showcase.boundingBox();

    // Both should exist
    expect(tableBox).toBeTruthy();
    expect(showcaseBox).toBeTruthy();

    // Both should have same width (allowing 5px tolerance for rounding)
    if (tableBox && showcaseBox) {
      expect(Math.abs(tableBox.width - showcaseBox.width)).toBeLessThan(5);
    }
  });

  test('should display localized content in English', async ({ page }) => {
    // Set language to English
    await page.evaluate(() => localStorage.setItem('@olorin_language', 'en'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check English translations
    await expect(page.locator('text=Experience Premium Intelligence')).toBeVisible();
    await expect(page.locator('text=AI-powered features that adapt to how you watch')).toBeVisible();
    await expect(page.locator('text=See Widgets in Action')).toBeVisible();
    await expect(page.locator('text=Interactive Live Demo')).toBeVisible();
    await expect(page.locator('text=AI Smart Assistant')).toBeVisible();
    await expect(page.locator('text=Floating Widgets')).toBeVisible();
  });

  test('should display localized content in Hebrew', async ({ page }) => {
    // Set language to Hebrew
    await page.evaluate(() => localStorage.setItem('@olorin_language', 'he'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check Hebrew translations
    await expect(page.locator('text=חווה אינטליגנציה פרימיום')).toBeVisible();
    await expect(page.locator('text=ראה ווידג\'טים בפעולה')).toBeVisible();
    await expect(page.locator('text=הדגמה חיה אינטראקטיבית')).toBeVisible();
  });

  test('should have play button for video showcase', async ({ page }) => {
    const playButton = page.locator('[aria-label*="Play"]').first();
    await expect(playButton).toBeVisible();
  });

  test('should open video modal when play button is clicked', async ({ page }) => {
    const playButton = page.locator('[aria-label*="Play"]').first();
    await playButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Check if video modal is visible (look for video element or modal container)
    const videoModal = page.locator('video, [data-testid="widgets-intro-video"]').first();
    await expect(videoModal).toBeVisible({ timeout: 5000 });
  });

  test('should display widget demo card', async ({ page }) => {
    // Check for widget demo card text
    await expect(page.locator('text=Interactive Live Demo')).toBeVisible();

    // Check for INTERACTIVE DEMO badge
    await expect(page.locator('text=INTERACTIVE DEMO')).toBeVisible();
  });

  test('should display feature cards', async ({ page }) => {
    // Check AI Assistant card
    await expect(page.locator('text=AI Smart Assistant')).toBeVisible();
    await expect(page.locator('text=Personalized recommendations powered by machine learning')).toBeVisible();

    // Check Floating Widgets card
    await expect(page.locator('text=Floating Widgets')).toBeVisible();
    await expect(page.locator('text=Watch multiple channels while browsing content')).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const showcase = page.locator('[data-testid="premium-showcase"]').first();
    await expect(showcase).toBeVisible();

    // Check that it's still full width on mobile
    const showcaseBox = await showcase.boundingBox();
    const viewportWidth = page.viewportSize()?.width || 375;

    if (showcaseBox) {
      // Should be close to viewport width (minus some padding)
      expect(showcaseBox.width).toBeGreaterThan(viewportWidth * 0.9);
    }
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const showcase = page.locator('[data-testid="premium-showcase"]').first();
    await expect(showcase).toBeVisible();
  });

  test('should be responsive on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const showcase = page.locator('[data-testid="premium-showcase"]').first();
    await expect(showcase).toBeVisible();

    // Should be constrained to max-width on large screens
    const showcaseBox = await showcase.boundingBox();
    if (showcaseBox) {
      expect(showcaseBox.width).toBeLessThanOrEqual(1280 + 50); // max-width + padding tolerance
    }
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Play button should have proper ARIA labels
    const playButton = page.locator('[aria-label*="Play"]').first();
    await expect(playButton).toHaveAttribute('role', 'button');

    const ariaLabel = await playButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel?.length).toBeGreaterThan(0);
  });

  test('should animate on scroll into view', async ({ page }) => {
    // Scroll to top first
    await page.evaluate(() => window.scrollTo(0, 0));

    // Scroll to showcase section
    const showcase = page.locator('[data-testid="premium-showcase"]').first();
    await showcase.scrollIntoViewIfNeeded();

    // Wait for animation
    await page.waitForTimeout(600);

    // Element should be visible
    await expect(showcase).toBeVisible();
  });
});

test.describe('Premium Features Showcase - Visual Regression', () => {
  test('should match screenshot on desktop', async ({ page }) => {
    await page.goto('/subscribe');
    await page.waitForLoadState('networkidle');

    const showcase = page.locator('[data-testid="premium-showcase"]').first();
    await showcase.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600); // Wait for animations

    await expect(showcase).toHaveScreenshot('premium-showcase-desktop.png');
  });

  test('should match screenshot on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/subscribe');
    await page.waitForLoadState('networkidle');

    const showcase = page.locator('[data-testid="premium-showcase"]').first();
    await showcase.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    await expect(showcase).toHaveScreenshot('premium-showcase-mobile.png');
  });
});
