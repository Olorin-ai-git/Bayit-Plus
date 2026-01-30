/**
 * E2E Test: Beta 500 Insufficient Credits Flow
 *
 * Tests the error handling and user experience when beta users
 * attempt to use AI features without sufficient credits.
 */

import { test, expect } from '@playwright/test';

// Helper to set up authenticated beta user with low credits
async function setupLowCreditsBetaUser(page, balance = 3) {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-beta-user-123',
        email: 'beta@example.com',
        is_beta_user: true,
      }),
    });
  });

  await page.route('**/api/v1/beta/credits/balance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        balance,
        is_beta_user: true,
        total_credits: 500,
        used_credits: 500 - balance,
      }),
    });
  });

  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'mock-jwt-token');
  });
}

test.describe('Beta 500 Insufficient Credits Flow', () => {
  test('AI Search shows insufficient credits modal when balance too low', async ({ page }) => {
    await setupLowCreditsBetaUser(page, 3); // 3 credits, need 5 for search

    // Mock AI search API with insufficient credits error
    await page.route('**/api/v1/beta/ai-search', async (route) => {
      await route.fulfill({
        status: 402, // Payment Required
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'insufficient_credits',
          detail: 'AI Search requires 5 credits. You have 3 credits remaining.',
          required: 5,
          remaining: 3,
        }),
      });
    });

    await page.goto('/');

    // Open search modal
    await page.keyboard.press('Meta+K');

    // Attempt search
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await searchInput.fill('test query');
    await searchInput.press('Enter');

    // Verify insufficient credits modal appears
    const insufficientModal = page.locator('[data-testid="insufficient-credits-modal"]');
    await expect(insufficientModal).toBeVisible({ timeout: 5000 });

    // Verify modal content
    await expect(insufficientModal).toContainText(/insufficient.*credits|not enough.*credits/i);
    await expect(insufficientModal).toContainText('5 credits'); // Required
    await expect(insufficientModal).toContainText('3 credits'); // Remaining

    // Verify feature name is mentioned
    await expect(insufficientModal).toContainText(/ai search/i);

    // Verify "Upgrade" button is present
    const upgradeButton = insufficientModal.locator('button').filter({ hasText: /upgrade|get more credits/i });
    await expect(upgradeButton).toBeVisible();

    // Verify "Cancel" or "Close" button is present
    const cancelButton = insufficientModal.locator('button').filter({ hasText: /cancel|close/i });
    await expect(cancelButton).toBeVisible();
  });

  test('Upgrade button navigates to pricing page', async ({ page }) => {
    await setupLowCreditsBetaUser(page, 1);

    await page.route('**/api/v1/beta/ai-search', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'insufficient_credits',
          required: 5,
          remaining: 1,
        }),
      });
    });

    await page.goto('/');

    // Trigger insufficient credits flow
    await page.keyboard.press('Meta+K');
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for modal
    const insufficientModal = page.locator('[data-testid="insufficient-credits-modal"]');
    await expect(insufficientModal).toBeVisible({ timeout: 5000 });

    // Click upgrade button
    const upgradeButton = insufficientModal.locator('button').filter({ hasText: /upgrade/i });
    await upgradeButton.click();

    // Verify navigation to pricing/upgrade page
    await expect(page).toHaveURL(/\/pricing|\/upgrade|\/plans|\/subscribe/);
  });

  test('Cancel button closes insufficient credits modal', async ({ page }) => {
    await setupLowCreditsBetaUser(page, 2);

    await page.route('**/api/v1/beta/ai-search', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'insufficient_credits',
          required: 5,
          remaining: 2,
        }),
      });
    });

    await page.goto('/');

    // Trigger insufficient credits
    await page.keyboard.press('Meta+K');
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for modal
    const insufficientModal = page.locator('[data-testid="insufficient-credits-modal"]');
    await expect(insufficientModal).toBeVisible({ timeout: 5000 });

    // Click cancel button
    const cancelButton = insufficientModal.locator('button').filter({ hasText: /cancel|close/i });
    await cancelButton.click();

    // Verify modal is closed
    await expect(insufficientModal).not.toBeVisible();

    // Verify still on same page
    await expect(page).toHaveURL(/\/$|\/home/);
  });

  test('AI Recommendations show insufficient credits message inline', async ({ page }) => {
    await setupLowCreditsBetaUser(page, 1); // 1 credit, need 3 for recommendations

    // Mock recommendations API with insufficient credits error
    await page.route('**/api/v1/beta/ai-recommendations**', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'insufficient_credits',
          detail: 'AI Recommendations require 3 credits. You have 1 credit remaining.',
          required: 3,
          remaining: 1,
        }),
      });
    });

    await page.goto('/');

    // Verify recommendations panel shows insufficient credits message
    const recommendationsPanel = page.locator('[data-testid="ai-recommendations-panel"]');
    await expect(recommendationsPanel).toBeVisible({ timeout: 10000 });

    const insufficientMessage = recommendationsPanel.locator('[data-testid="recommendations-insufficient-credits"]');
    await expect(insufficientMessage).toBeVisible();
    await expect(insufficientMessage).toContainText(/insufficient|not enough/i);

    // Verify upgrade button in recommendations panel
    const upgradeButton = recommendationsPanel.locator('button').filter({ hasText: /upgrade/i });
    await expect(upgradeButton).toBeVisible();
  });

  test('Insufficient credits modal shows feature-specific messaging', async ({ page }) => {
    await setupLowCreditsBetaUser(page, 2);

    await page.route('**/api/v1/beta/ai-search', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'insufficient_credits',
          detail: 'Custom error message for AI Search',
          required: 5,
          remaining: 2,
          feature: 'ai_search',
        }),
      });
    });

    await page.goto('/');
    await page.keyboard.press('Meta+K');
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await searchInput.fill('test');
    await searchInput.press('Enter');

    const insufficientModal = page.locator('[data-testid="insufficient-credits-modal"]');
    await expect(insufficientModal).toBeVisible({ timeout: 5000 });

    // Verify feature name is displayed
    await expect(insufficientModal).toContainText(/ai search/i);

    // Verify credit requirement details
    await expect(insufficientModal).toContainText('5 credits required');
    await expect(insufficientModal).toContainText('2 credits available');
  });

  test('Zero credits shows upgrade prompt in credit widget', async ({ page }) => {
    await setupLowCreditsBetaUser(page, 0); // Zero credits

    await page.goto('/');

    // Verify credit widget shows zero state
    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).toBeVisible({ timeout: 10000 });
    await expect(creditWidget).toContainText('0');

    // Verify "Get More Credits" or "Upgrade" button in widget
    const widgetUpgradeButton = creditWidget.locator('button').filter({ hasText: /upgrade|get more|add credits/i });
    await expect(widgetUpgradeButton).toBeVisible();

    // Click upgrade button
    await widgetUpgradeButton.click();

    // Verify navigation to upgrade page
    await expect(page).toHaveURL(/\/pricing|\/upgrade/);
  });

  test('Insufficient credits prevents feature usage before API call', async ({ page }) => {
    await setupLowCreditsBetaUser(page, 2);

    await page.goto('/');

    // Verify credit balance is displayed
    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).toContainText('2');

    // Try to use AI search (requires 5 credits)
    await page.keyboard.press('Meta+K');

    // Verify warning appears immediately (before API call)
    const preAuthWarning = page.locator('[data-testid="pre-auth-warning"]');
    await expect(preAuthWarning).toBeVisible({ timeout: 3000 });
    await expect(preAuthWarning).toContainText(/insufficient.*credits|not enough/i);
  });

  test('Insufficient credits modal includes usage history link', async ({ page }) => {
    await setupLowCreditsBetaUser(page, 1);

    await page.route('**/api/v1/beta/ai-search', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'insufficient_credits',
          required: 5,
          remaining: 1,
        }),
      });
    });

    await page.goto('/');
    await page.keyboard.press('Meta+K');
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await searchInput.fill('test');
    await searchInput.press('Enter');

    const insufficientModal = page.locator('[data-testid="insufficient-credits-modal"]');
    await expect(insufficientModal).toBeVisible({ timeout: 5000 });

    // Verify "View Usage History" link exists
    const usageHistoryLink = insufficientModal.locator('a, button').filter({ hasText: /view.*usage|usage.*history/i });
    await expect(usageHistoryLink).toBeVisible();

    // Click link
    await usageHistoryLink.click();

    // Verify navigation to usage history page
    await expect(page).toHaveURL(/\/usage|\/credits\/history|\/account\/credits/);
  });
});
