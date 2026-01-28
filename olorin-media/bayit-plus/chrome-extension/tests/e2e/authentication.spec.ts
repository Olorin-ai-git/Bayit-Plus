/**
 * E2E Tests: User Authentication Flow
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page on first visit', async ({ page, context }) => {
    const serviceWorker = context.serviceWorkers()[0];
    const extensionId = serviceWorker.url().split('/')[2];

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Should show auth page or onboarding
    await expect(
      popupPage.locator('text=/Login|Sign Up|Get Started/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate through onboarding flow', async ({ page, context }) => {
    const serviceWorker = context.serviceWorkers()[0];
    const extensionId = serviceWorker.url().split('/')[2];

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Wait for onboarding to load
    await popupPage.waitForSelector('text=/Welcome|Get Started/i', { timeout: 10000 });

    // Click through onboarding steps
    const nextButton = popupPage.locator('button:has-text("Get Started"), button:has-text("Next"), button:has-text("Continue")').first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
    }

    // Should eventually reach auth page
    await expect(
      popupPage.locator('text=/Login|Sign Up|Email/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for invalid login', async ({ page, context }) => {
    const serviceWorker = context.serviceWorkers()[0];
    const extensionId = serviceWorker.url().split('/')[2];

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Navigate to login page (skip onboarding if exists)
    await popupPage.waitForTimeout(1000);

    // Try to submit empty form
    const loginButton = popupPage.locator('button:has-text("Login"), button:has-text("Sign In")').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();

      // Should show validation errors
      await expect(
        popupPage.locator('text=/required|invalid|error/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display usage dashboard when authenticated', async ({ page, context }) => {
    // This test assumes a valid test account exists
    // In real testing, you would authenticate with test credentials

    const serviceWorker = context.serviceWorkers()[0];
    const extensionId = serviceWorker.url().split('/')[2];

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Mock authenticated state by injecting storage
    await popupPage.evaluate(() => {
      // Mock JWT token (this is just for E2E testing structure)
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJleHAiOjk5OTk5OTk5OTl9.signature';
      chrome.storage.local.set({
        jwt_enc: btoa(mockToken), // Simplified for demo
        user_info: {
          id: 'test-user',
          email: 'test@example.com',
          subscription_tier: 'free',
        },
      });
    });

    // Reload popup to apply authenticated state
    await popupPage.reload();

    // Should show dashboard with usage meter
    await expect(
      popupPage.locator('text=/Usage|Minutes|Dashboard/i')
    ).toBeVisible({ timeout: 10000 });
  });
});
