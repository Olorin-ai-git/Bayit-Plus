/**
 * E2E Tests: Dubbing Activation Flow
 */

import { test, expect } from '@playwright/test';

test.describe('Dubbing Activation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to supported site
    await page.goto('https://www.screenil.com');
    await page.waitForTimeout(2000);
  });

  test('should show dubbing controls overlay on video', async ({ page }) => {
    // Find video element
    const video = page.locator('video').first();
    await expect(video).toBeVisible({ timeout: 10000 });

    // Check for dubbing controls overlay
    const dubbingControls = page.locator('[data-bayit-dubbing-controls]');
    await expect(dubbingControls).toBeVisible({ timeout: 5000 });
  });

  test('should have language selector with Hebrew to English/Spanish', async ({ page }) => {
    const dubbingControls = page.locator('[data-bayit-dubbing-controls]');
    await expect(dubbingControls).toBeVisible({ timeout: 10000 });

    // Check for language selector
    const languageSelector = dubbingControls.locator('[data-language-selector]');
    await expect(languageSelector).toBeVisible();

    // Should have English and Spanish options
    await languageSelector.click();
    await expect(page.locator('text=English')).toBeVisible();
    await expect(page.locator('text=Spanish')).toBeVisible();
  });

  test('should toggle dubbing on/off with button click', async ({ page }) => {
    const dubbingControls = page.locator('[data-bayit-dubbing-controls]');
    await expect(dubbingControls).toBeVisible({ timeout: 10000 });

    const startButton = dubbingControls.locator('[data-start-dubbing]');
    await expect(startButton).toBeVisible();

    // Initial state: not dubbing
    await expect(startButton).toHaveText(/Start Dubbing/i);

    // Click to start dubbing
    await startButton.click();

    // Should change to "Stop Dubbing"
    await expect(startButton).toHaveText(/Stop Dubbing/i, { timeout: 5000 });

    // Click again to stop
    await startButton.click();

    // Should return to "Start Dubbing"
    await expect(startButton).toHaveText(/Start Dubbing/i, { timeout: 5000 });
  });

  test('should show usage meter during dubbing', async ({ page }) => {
    const dubbingControls = page.locator('[data-bayit-dubbing-controls]');
    await expect(dubbingControls).toBeVisible({ timeout: 10000 });

    // Start dubbing
    const startButton = dubbingControls.locator('[data-start-dubbing]');
    await startButton.click();

    // Usage display should be visible
    const usageDisplay = page.locator('[data-usage-display]');
    await expect(usageDisplay).toBeVisible({ timeout: 5000 });

    // Should show format like "0.0 / 5.0 mins"
    await expect(usageDisplay).toContainText(/\d+\.\d+\s*\/\s*\d+\.\d+/);
  });

  test('should show quota exceeded modal when limit reached', async ({ page, context }) => {
    // Mock quota to be nearly exhausted
    const serviceWorker = context.serviceWorkers()[0];
    const extensionId = serviceWorker.url().split('/')[2];

    // Set quota to 4.9 minutes (near limit of 5.0)
    await page.evaluate(() => {
      chrome.storage.local.set({
        usage_data: {
          dailyMinutesUsed: 4.9,
          lastResetDate: new Date().toISOString().split('T')[0],
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });
    });

    // Start dubbing
    const dubbingControls = page.locator('[data-bayit-dubbing-controls]');
    await expect(dubbingControls).toBeVisible({ timeout: 10000 });

    const startButton = dubbingControls.locator('[data-start-dubbing]');
    await startButton.click();

    // Wait for quota to exhaust (0.1 minutes = 6 seconds)
    await page.waitForTimeout(10000);

    // Should show quota exceeded modal
    const modal = page.locator('[data-quota-exceeded-modal]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal).toContainText(/quota.*exhausted/i);

    // Should have upgrade button
    const upgradeButton = modal.locator('[data-upgrade-button]');
    await expect(upgradeButton).toBeVisible();
  });

  test('should have volume controls for original and dubbed audio', async ({ page }) => {
    const dubbingControls = page.locator('[data-bayit-dubbing-controls]');
    await expect(dubbingControls).toBeVisible({ timeout: 10000 });

    // Check for volume sliders
    const originalVolumeSlider = page.locator('[data-original-volume]');
    const dubbedVolumeSlider = page.locator('[data-dubbed-volume]');

    await expect(originalVolumeSlider).toBeVisible();
    await expect(dubbedVolumeSlider).toBeVisible();

    // Should have accessible labels
    await expect(originalVolumeSlider).toHaveAttribute('aria-label', /original.*volume/i);
    await expect(dubbedVolumeSlider).toHaveAttribute('aria-label', /dubbed.*voice.*volume/i);
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    const dubbingControls = page.locator('[data-bayit-dubbing-controls]');
    await expect(dubbingControls).toBeVisible({ timeout: 10000 });

    // Press Ctrl+D to toggle dubbing
    await page.keyboard.press('Control+KeyD');

    // Should start dubbing
    const startButton = dubbingControls.locator('[data-start-dubbing]');
    await expect(startButton).toHaveText(/Stop Dubbing/i, { timeout: 5000 });

    // Press Ctrl+D again to stop
    await page.keyboard.press('Control+KeyD');

    // Should stop dubbing
    await expect(startButton).toHaveText(/Start Dubbing/i, { timeout: 5000 });
  });

  test('should persist user settings across sessions', async ({ page, context }) => {
    const dubbingControls = page.locator('[data-bayit-dubbing-controls]');
    await expect(dubbingControls).toBeVisible({ timeout: 10000 });

    // Change language to Spanish
    const languageSelector = dubbingControls.locator('[data-language-selector]');
    await languageSelector.selectOption('es');

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Language should still be Spanish
    const reloadedLanguageSelector = page.locator('[data-language-selector]');
    await expect(reloadedLanguageSelector).toHaveValue('es');
  });
});
