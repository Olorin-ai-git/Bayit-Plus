/**
 * E2E Test: Beta 500 AI Search
 *
 * Tests the AI-powered semantic search functionality with credit deduction.
 * Verifies search UI, results display, and proper credit tracking.
 */

import { test, expect } from '@playwright/test';

// Helper to set up authenticated beta user
async function setupBetaUser(page) {
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
        balance: 500,
        is_beta_user: true,
      }),
    });
  });

  // Set auth token in localStorage
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'mock-jwt-token');
  });
}

test.describe('Beta 500 AI Search', () => {
  test.beforeEach(async ({ page }) => {
    await setupBetaUser(page);
    await page.goto('/');
  });

  test('AI Search opens with Cmd+K shortcut', async ({ page }) => {
    // Press Cmd+K (Meta+K on macOS)
    await page.keyboard.press('Meta+K');

    // Verify search modal is visible
    const searchModal = page.locator('[data-testid="ai-search-modal"]');
    await expect(searchModal).toBeVisible({ timeout: 3000 });

    // Verify search input is focused
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await expect(searchInput).toBeFocused();
  });

  test('AI Search button in navigation opens modal', async ({ page }) => {
    // Click AI Search button in header
    const searchButton = page.locator('button').filter({ hasText: /ai search/i });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // Verify modal is open
    const searchModal = page.locator('[data-testid="ai-search-modal"]');
    await expect(searchModal).toBeVisible();
  });

  test('AI Search performs search and displays results', async ({ page }) => {
    // Mock AI search API
    await page.route('**/api/v1/beta/ai-search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              content_id: 'content-1',
              title: 'Jewish Comedy Special',
              type: 'movie',
              match_score: 0.95,
              snippet: 'Hilarious Jewish humor...',
            },
            {
              content_id: 'content-2',
              title: 'Israeli Sitcom',
              type: 'series',
              match_score: 0.87,
              snippet: 'Family comedy from Israel...',
            },
          ],
          credits_used: 5,
          remaining_credits: 495,
        }),
      });
    });

    // Open search modal
    await page.keyboard.press('Meta+K');

    // Type search query
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await searchInput.fill('Jewish comedy');
    await searchInput.press('Enter');

    // Verify loading state
    const loadingIndicator = page.locator('[data-testid="search-loading"]');
    await expect(loadingIndicator).toBeVisible();

    // Wait for results
    await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });

    // Verify results are displayed
    const results = page.locator('[data-testid="search-results"]');
    await expect(results).toBeVisible();

    const resultItems = page.locator('[data-testid="search-result-item"]');
    await expect(resultItems).toHaveCount(2);

    // Verify first result content
    const firstResult = resultItems.first();
    await expect(firstResult).toContainText('Jewish Comedy Special');
    await expect(firstResult).toContainText('0.95'); // Match score

    // Verify credit deduction message
    const creditsUsedMessage = page.locator('[data-testid="credits-used-message"]');
    await expect(creditsUsedMessage).toContainText('5 credits');

    // Verify credit balance updated
    const creditBalance = page.locator('[data-testid="credit-balance"]');
    await expect(creditBalance).toContainText('495');
  });

  test('AI Search shows insufficient credits error', async ({ page }) => {
    // Mock credits balance with only 3 credits (insufficient for search)
    await page.route('**/api/v1/beta/credits/balance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 3,
          is_beta_user: true,
        }),
      });
    });

    // Mock search API to return insufficient credits error
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

    // Open search and attempt query
    await page.keyboard.press('Meta+K');
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await searchInput.fill('test query');
    await searchInput.press('Enter');

    // Verify insufficient credits modal appears
    const insufficientModal = page.locator('[data-testid="insufficient-credits-modal"]');
    await expect(insufficientModal).toBeVisible({ timeout: 5000 });
    await expect(insufficientModal).toContainText(/insufficient credits/i);
    await expect(insufficientModal).toContainText('5 credits');
    await expect(insufficientModal).toContainText('3 credits');

    // Verify "Upgrade" button is present
    const upgradeButton = page.locator('[data-testid="upgrade-button"]');
    await expect(upgradeButton).toBeVisible();
  });

  test('AI Search result click navigates to content', async ({ page }) => {
    // Mock search API
    await page.route('**/api/v1/beta/ai-search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              content_id: 'movie-123',
              title: 'Test Movie',
              type: 'movie',
              match_score: 0.95,
            },
          ],
          credits_used: 5,
          remaining_credits: 495,
        }),
      });
    });

    // Open search and perform query
    await page.keyboard.press('Meta+K');
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 });

    // Click on first result
    const firstResult = page.locator('[data-testid="search-result-item"]').first();
    await firstResult.click();

    // Verify navigation to content page
    await expect(page).toHaveURL(/\/content\/movie-123|\/movie\/movie-123|\/watch\/movie-123/);
  });

  test('AI Search modal closes on Escape key', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Meta+K');
    const searchModal = page.locator('[data-testid="ai-search-modal"]');
    await expect(searchModal).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Verify modal is closed
    await expect(searchModal).not.toBeVisible();
  });
});
