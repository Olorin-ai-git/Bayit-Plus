/**
 * E2E Tests: Extension Installation and Basic Functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Extension Installation', () => {
  test('should load extension successfully', async ({ page, context }) => {
    // Check if extension is loaded
    const extensionTargets = context.serviceWorkers();
    expect(extensionTargets.length).toBeGreaterThan(0);
  });

  test('should open extension popup', async ({ page, context }) => {
    // Navigate to any page (extension needs a page context)
    await page.goto('https://www.google.com');

    // Get extension ID from service worker
    const serviceWorker = context.serviceWorkers()[0];
    const extensionId = serviceWorker.url().split('/')[2];

    // Open extension popup
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Verify popup loads
    await expect(popupPage.locator('body')).toBeVisible();

    // Should show onboarding or auth page on first install
    await expect(
      popupPage.locator('text=/Welcome|Login|Get Started/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should inject content script on supported sites', async ({ page }) => {
    // Navigate to screenil.com (supported site)
    await page.goto('https://www.screenil.com');

    // Wait for content script to inject
    await page.waitForTimeout(2000);

    // Check for Bayit+ translator marker (content script sets this)
    const hasContentScript = await page.evaluate(() => {
      return document.documentElement.hasAttribute('data-bayit-translator-ready');
    });

    expect(hasContentScript).toBe(true);
  });

  test('should NOT inject content script on unsupported sites', async ({ page }) => {
    // Navigate to unsupported site
    await page.goto('https://www.youtube.com');

    // Wait
    await page.waitForTimeout(2000);

    // Should NOT have content script
    const hasContentScript = await page.evaluate(() => {
      return document.documentElement.hasAttribute('data-bayit-translator-ready');
    });

    expect(hasContentScript).toBe(false);
  });
});
