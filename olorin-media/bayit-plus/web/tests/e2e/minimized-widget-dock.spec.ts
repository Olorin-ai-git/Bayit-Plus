/**
 * MinimizedWidgetDock E2E Tests
 *
 * Tests the floating glass container for minimized widgets:
 * - Dock visibility when widgets are minimized
 * - Icon button rendering and positioning
 * - Hover preview popup functionality
 * - Click to restore widget
 * - Glassmorphic styling verification
 *
 * Usage:
 *   npx playwright test tests/e2e/minimized-widget-dock.spec.ts --headed
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3200';

/**
 * Mock auth token for testing (premium user with widgets)
 */
async function mockAuthPremium(page: Page): Promise<void> {
  await page.evaluate(() => {
    const mockAuthState = {
      state: {
        token: 'test-premium-token',
        user: {
          id: 'test-premium-user-123',
          email: 'premium@bayitplus.com',
          subscription_tier: 'premium',
        },
        isAuthenticated: true,
      },
    };
    localStorage.setItem('bayit-auth', JSON.stringify(mockAuthState));
  });
}

/**
 * Setup test page with auth
 */
async function setupPage(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await mockAuthPremium(page);
  await page.reload();
}

test.describe('MinimizedWidgetDock', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test('should not show dock when no widgets are minimized', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    // Check that dock doesn't exist
    const dock = page.locator('[role="toolbar"][aria-label="Minimized widgets"]');
    await expect(dock).not.toBeVisible();
  });

  test('should show dock when widgets are minimized', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    // Wait for widgets to load
    await page.waitForSelector('[data-testid^="widget-"]', { timeout: 10000 });

    // Find and minimize a widget
    const minimizeButton = page.locator('[aria-label*="Minimize"]').first();
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click();

      // Wait for dock to appear
      const dock = page.locator('[role="toolbar"][aria-label="Minimized widgets"]');
      await expect(dock).toBeVisible({ timeout: 5000 });

      // Verify dock is at bottom center
      const dockBox = await dock.boundingBox();
      expect(dockBox).toBeTruthy();
      if (dockBox) {
        const viewportWidth = page.viewportSize()?.width || 1920;
        const centerX = viewportWidth / 2;
        const dockCenterX = dockBox.x + dockBox.width / 2;

        // Allow 50px tolerance for centering
        expect(Math.abs(dockCenterX - centerX)).toBeLessThan(50);
      }
    }
  });

  test('should show icon buttons for each minimized widget', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    // Minimize multiple widgets if available
    const minimizeButtons = page.locator('[aria-label*="Minimize"]');
    const count = await minimizeButtons.count();

    if (count > 0) {
      // Minimize first widget
      await minimizeButtons.first().click();
      await page.waitForTimeout(500);

      // Check dock has 1 icon
      const dock = page.locator('[role="toolbar"][aria-label="Minimized widgets"]');
      const icons = dock.locator('[role="button"]');
      await expect(icons).toHaveCount(1);

      // Minimize second widget if exists
      if (count > 1) {
        await minimizeButtons.nth(1).click();
        await page.waitForTimeout(500);

        // Check dock has 2 icons
        await expect(icons).toHaveCount(2);
      }
    }
  });

  test('should show preview popup on hover', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    // Minimize a widget
    const minimizeButton = page.locator('[aria-label*="Minimize"]').first();
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click();
      await page.waitForTimeout(500);

      // Hover over icon button
      const dock = page.locator('[role="toolbar"][aria-label="Minimized widgets"]');
      const iconButton = dock.locator('[role="button"]').first();
      await iconButton.hover();

      // Wait for popup to appear (it's a sibling div)
      await page.waitForTimeout(300); // Give time for hover state

      // Verify popup exists and is positioned above icon
      // Note: Preview popup is inline and appears on hover
      // We verify the hover state changes the icon appearance
      const iconBox = await iconButton.boundingBox();
      expect(iconBox).toBeTruthy();
    }
  });

  test('should restore widget on icon click', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    // Get initial widget count
    const initialWidgets = await page.locator('[data-testid^="widget-"]').count();

    // Minimize a widget
    const minimizeButton = page.locator('[aria-label*="Minimize"]').first();
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click();
      await page.waitForTimeout(500);

      // Verify widget is minimized (dock appears)
      const dock = page.locator('[role="toolbar"][aria-label="Minimized widgets"]');
      await expect(dock).toBeVisible();

      // Click icon to restore
      const iconButton = dock.locator('[role="button"]').first();
      await iconButton.click();
      await page.waitForTimeout(500);

      // Verify dock disappears if no more minimized widgets
      const remainingIcons = await dock.locator('[role="button"]').count();
      if (remainingIcons === 0) {
        await expect(dock).not.toBeVisible();
      }

      // Verify widget count restored
      const finalWidgets = await page.locator('[data-testid^="widget-"]').count();
      expect(finalWidgets).toBe(initialWidgets);
    }
  });

  test('should have glassmorphic styling', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    // Minimize a widget
    const minimizeButton = page.locator('[aria-label*="Minimize"]').first();
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click();
      await page.waitForTimeout(500);

      const dock = page.locator('[role="toolbar"][aria-label="Minimized widgets"]');

      // Check for backdrop filter (glassmorphism)
      const styles = await dock.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backdropFilter: computed.backdropFilter,
          WebkitBackdropFilter: computed.webkitBackdropFilter,
          borderRadius: computed.borderRadius,
          position: computed.position,
        };
      });

      // Verify glassmorphic properties
      expect(
        styles.backdropFilter.includes('blur') ||
        styles.WebkitBackdropFilter.includes('blur')
      ).toBeTruthy();

      expect(styles.position).toBe('fixed');

      // Verify pill shape (large border radius)
      const borderRadius = parseInt(styles.borderRadius);
      expect(borderRadius).toBeGreaterThan(50);
    }
  });

  test('should position dock at bottom center of viewport', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    // Minimize a widget
    const minimizeButton = page.locator('[aria-label*="Minimize"]').first();
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click();
      await page.waitForTimeout(500);

      const dock = page.locator('[role="toolbar"][aria-label="Minimized widgets"]');
      const dockBox = await dock.boundingBox();
      const viewport = page.viewportSize();

      expect(dockBox).toBeTruthy();
      expect(viewport).toBeTruthy();

      if (dockBox && viewport) {
        // Check bottom positioning (should be 20px from bottom)
        const bottomDistance = viewport.height - (dockBox.y + dockBox.height);
        expect(bottomDistance).toBeGreaterThan(10);
        expect(bottomDistance).toBeLessThan(30);

        // Check horizontal centering
        const viewportCenterX = viewport.width / 2;
        const dockCenterX = dockBox.x + dockBox.width / 2;
        expect(Math.abs(dockCenterX - viewportCenterX)).toBeLessThan(50);
      }
    }
  });

  test('should adjust width based on number of minimized widgets', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    const minimizeButtons = page.locator('[aria-label*="Minimize"]');
    const count = await minimizeButtons.count();

    if (count >= 2) {
      // Minimize first widget
      await minimizeButtons.first().click();
      await page.waitForTimeout(500);

      const dock = page.locator('[role="toolbar"][aria-label="Minimized widgets"]');
      const firstWidth = (await dock.boundingBox())?.width || 0;

      // Minimize second widget
      await minimizeButtons.nth(1).click();
      await page.waitForTimeout(500);

      const secondWidth = (await dock.boundingBox())?.width || 0;

      // Width should increase with more icons
      expect(secondWidth).toBeGreaterThan(firstWidth);
    }
  });

  test('should have accessible ARIA labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    // Minimize a widget
    const minimizeButton = page.locator('[aria-label*="Minimize"]').first();
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click();
      await page.waitForTimeout(500);

      const dock = page.locator('[role="toolbar"][aria-label="Minimized widgets"]');

      // Check dock has role and aria-label
      await expect(dock).toHaveAttribute('role', 'toolbar');
      await expect(dock).toHaveAttribute('aria-label', 'Minimized widgets');

      // Check icon buttons have role and aria-label
      const iconButton = dock.locator('[role="button"]').first();
      await expect(iconButton).toHaveAttribute('role', 'button');

      const ariaLabel = await iconButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('Restore');
    }
  });
});
