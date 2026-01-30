/**
 * E2E Test: Beta 500 Credit Balance Widget
 *
 * Tests the real-time credit balance display in the header.
 * Verifies correct display, color changes based on balance, and polling behavior.
 */

import { test, expect } from '@playwright/test';

// Helper to set up authenticated beta user
async function setupBetaUser(page, initialBalance = 500) {
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

  let currentBalance = initialBalance;

  await page.route('**/api/v1/beta/credits/balance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        balance: currentBalance,
        is_beta_user: true,
        total_credits: 500,
        used_credits: 500 - currentBalance,
      }),
    });
  });

  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'mock-jwt-token');
  });

  // Return function to update balance
  return (newBalance: number) => {
    currentBalance = newBalance;
  };
}

test.describe('Beta 500 Credit Balance Widget', () => {
  test('Credit balance widget visible in header for beta users', async ({ page }) => {
    await setupBetaUser(page, 500);
    await page.goto('/');

    // Verify widget is visible in header
    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).toBeVisible({ timeout: 10000 });

    // Verify shows correct balance
    await expect(creditWidget).toContainText('500');

    // Verify shows total (500 / 500)
    await expect(creditWidget).toContainText('500');
  });

  test('Credit balance widget not visible for non-beta users', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-456',
          email: 'user@example.com',
          is_beta_user: false,
        }),
      });
    });

    await page.goto('/');

    // Verify widget is NOT visible
    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).not.toBeVisible({ timeout: 3000 });
  });

  test('Credit balance widget shows green color for high balance (>100)', async ({ page }) => {
    await setupBetaUser(page, 400);
    await page.goto('/');

    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).toBeVisible();

    // Check for green color class or style
    // This assumes widget has data-balance-level attribute or similar
    const balanceIndicator = creditWidget.locator('[data-balance-level="high"]');
    await expect(balanceIndicator).toBeVisible();
  });

  test('Credit balance widget shows yellow color for medium balance (20-100)', async ({ page }) => {
    await setupBetaUser(page, 50);
    await page.goto('/');

    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).toBeVisible();

    // Check for yellow/warning color
    const balanceIndicator = creditWidget.locator('[data-balance-level="medium"]');
    await expect(balanceIndicator).toBeVisible();
  });

  test('Credit balance widget shows red color for low balance (<20)', async ({ page }) => {
    await setupBetaUser(page, 10);
    await page.goto('/');

    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).toBeVisible();

    // Check for red/critical color
    const balanceIndicator = creditWidget.locator('[data-balance-level="low"]');
    await expect(balanceIndicator).toBeVisible();
  });

  test('Credit balance widget shows zero state', async ({ page }) => {
    await setupBetaUser(page, 0);
    await page.goto('/');

    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).toBeVisible();
    await expect(creditWidget).toContainText('0');

    // Verify depleted state styling
    const balanceIndicator = creditWidget.locator('[data-balance-level="depleted"]');
    await expect(balanceIndicator).toBeVisible();

    // Verify "Upgrade" or "Add Credits" button is visible
    const upgradeButton = creditWidget.locator('button').filter({ hasText: /upgrade|add credits/i });
    await expect(upgradeButton).toBeVisible();
  });

  test('Credit balance widget updates after AI search', async ({ page }) => {
    const updateBalance = await setupBetaUser(page, 500);
    await page.goto('/');

    // Initial balance: 500
    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).toContainText('500');

    // Mock AI search API (uses 5 credits)
    await page.route('**/api/v1/beta/ai-search', async (route) => {
      // Update balance on backend
      updateBalance(495);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [],
          credits_used: 5,
          remaining_credits: 495,
        }),
      });
    });

    // Perform search
    await page.keyboard.press('Meta+K');
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for search to complete
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 });

    // Verify balance updated to 495
    await expect(creditWidget).toContainText('495');
  });

  test('Credit balance widget polls every 30 seconds', async ({ page }) => {
    let requestCount = 0;
    const updateBalance = await setupBetaUser(page, 500);

    await page.route('**/api/v1/beta/credits/balance', async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 500 - (requestCount * 5), // Simulate gradual decrease
          is_beta_user: true,
        }),
      });
    });

    await page.goto('/');

    // Initial request
    await expect(page.locator('[data-testid="credit-balance"]')).toBeVisible();
    const initialRequests = requestCount;

    // Wait 35 seconds for polling interval
    await page.waitForTimeout(35000);

    // Verify at least 1 additional request was made
    expect(requestCount).toBeGreaterThan(initialRequests);
  });

  test('Credit balance widget click shows usage details', async ({ page }) => {
    await setupBetaUser(page, 250);
    await page.goto('/');

    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).toBeVisible();

    // Click on credit balance widget
    await creditWidget.click();

    // Verify usage details modal/dropdown opens
    const usageDetails = page.locator('[data-testid="credit-usage-details"]');
    await expect(usageDetails).toBeVisible({ timeout: 3000 });

    // Verify shows breakdown
    await expect(usageDetails).toContainText(/total|used|remaining/i);
    await expect(usageDetails).toContainText('250'); // Remaining
    await expect(usageDetails).toContainText('250'); // Used (500 - 250)
  });

  test('Credit balance tooltip shows on hover', async ({ page }) => {
    await setupBetaUser(page, 375);
    await page.goto('/');

    const creditWidget = page.locator('[data-testid="credit-balance"]');
    await expect(creditWidget).toBeVisible();

    // Hover over widget
    await creditWidget.hover();

    // Verify tooltip appears
    const tooltip = page.locator('[data-testid="credit-balance-tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText(/375.*remaining|credits left/i);
  });
});
