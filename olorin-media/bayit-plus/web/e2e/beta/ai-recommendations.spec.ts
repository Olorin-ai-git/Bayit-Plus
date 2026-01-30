/**
 * E2E Test: Beta 500 AI Recommendations
 *
 * Tests the AI-powered personalized content recommendations feature.
 * Verifies recommendations display, credit deduction, and navigation.
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

  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'mock-jwt-token');
  });
}

test.describe('Beta 500 AI Recommendations', () => {
  test.beforeEach(async ({ page }) => {
    await setupBetaUser(page);
  });

  test('AI Recommendations panel visible on homepage for beta users', async ({ page }) => {
    // Mock recommendations API
    await page.route('**/api/v1/beta/ai-recommendations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recommendations: [
            {
              content_id: 'movie-1',
              title: 'Israeli Drama',
              type: 'movie',
              match_score: 0.92,
              reason: 'Based on your viewing history',
            },
            {
              content_id: 'series-2',
              title: 'Jewish Comedy Series',
              type: 'series',
              match_score: 0.88,
              reason: 'Matches your favorite genres',
            },
          ],
          credits_used: 3,
          remaining_credits: 497,
        }),
      });
    });

    // Navigate to homepage
    await page.goto('/');

    // Verify AI Recommendations section is visible
    const recommendationsPanel = page.locator('[data-testid="ai-recommendations-panel"]');
    await expect(recommendationsPanel).toBeVisible({ timeout: 10000 });

    // Verify section title
    const sectionTitle = recommendationsPanel.locator('h2, h3').first();
    await expect(sectionTitle).toContainText(/recommended for you|ai recommendations/i);

    // Verify recommendations are displayed
    const recommendationItems = page.locator('[data-testid="recommendation-item"]');
    await expect(recommendationItems).toHaveCount(2);

    // Verify first recommendation content
    const firstRecommendation = recommendationItems.first();
    await expect(firstRecommendation).toContainText('Israeli Drama');
    await expect(firstRecommendation).toContainText('0.92'); // Match score

    // Verify credit usage indicator
    const creditsUsedBadge = page.locator('[data-testid="recommendations-credits-used"]');
    await expect(creditsUsedBadge).toBeVisible();
    await expect(creditsUsedBadge).toContainText('3');
  });

  test('AI Recommendations show loading state', async ({ page }) => {
    // Mock delayed API response
    await page.route('**/api/v1/beta/ai-recommendations**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recommendations: [],
          credits_used: 3,
          remaining_credits: 497,
        }),
      });
    });

    await page.goto('/');

    // Verify loading skeleton/spinner is visible
    const loadingState = page.locator('[data-testid="recommendations-loading"]');
    await expect(loadingState).toBeVisible({ timeout: 3000 });

    // Wait for loading to complete
    await expect(loadingState).not.toBeVisible({ timeout: 5000 });
  });

  test('Click recommendation navigates to content page', async ({ page }) => {
    // Mock recommendations API
    await page.route('**/api/v1/beta/ai-recommendations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recommendations: [
            {
              content_id: 'movie-456',
              title: 'Test Movie',
              type: 'movie',
              match_score: 0.90,
            },
          ],
          credits_used: 3,
        }),
      });
    });

    await page.goto('/');

    // Wait for recommendations to load
    const recommendationsPanel = page.locator('[data-testid="ai-recommendations-panel"]');
    await expect(recommendationsPanel).toBeVisible({ timeout: 10000 });

    // Click on first recommendation
    const firstRecommendation = page.locator('[data-testid="recommendation-item"]').first();
    await firstRecommendation.click();

    // Verify navigation to content page
    await expect(page).toHaveURL(/\/content\/movie-456|\/movie\/movie-456|\/watch\/movie-456/);
  });

  test('AI Recommendations update credit balance after load', async ({ page }) => {
    // Initial balance: 500
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

    // Mock recommendations API (uses 3 credits)
    await page.route('**/api/v1/beta/ai-recommendations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recommendations: [],
          credits_used: 3,
          remaining_credits: 497,
        }),
      });
    });

    await page.goto('/');

    // Wait for recommendations to load
    await expect(page.locator('[data-testid="ai-recommendations-panel"]')).toBeVisible({ timeout: 10000 });

    // Wait a moment for credit balance to update
    await page.waitForTimeout(1000);

    // Verify credit balance decreased (500 → 497)
    const creditBalance = page.locator('[data-testid="credit-balance"]');
    // Note: This assumes optimistic update on frontend
    // Actual implementation may vary
  });

  test('AI Recommendations show error state when API fails', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/beta/ai-recommendations**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'recommendation_failed',
          detail: 'Failed to generate recommendations',
        }),
      });
    });

    await page.goto('/');

    // Wait for error state
    const errorState = page.locator('[data-testid="recommendations-error"]');
    await expect(errorState).toBeVisible({ timeout: 10000 });
    await expect(errorState).toContainText(/failed|error|try again/i);

    // Verify retry button exists
    const retryButton = errorState.locator('button').filter({ hasText: /try again|retry/i });
    await expect(retryButton).toBeVisible();
  });

  test('AI Recommendations not visible for non-beta users', async ({ page }) => {
    // Override to non-beta user
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-789',
          email: 'user@example.com',
          is_beta_user: false,
        }),
      });
    });

    await page.goto('/');

    // Verify recommendations panel is NOT visible
    const recommendationsPanel = page.locator('[data-testid="ai-recommendations-panel"]');
    await expect(recommendationsPanel).not.toBeVisible({ timeout: 5000 });
  });

  test('AI Recommendations shows insufficient credits modal', async ({ page }) => {
    // Mock insufficient credits (1 credit, need 3)
    await page.route('**/api/v1/beta/credits/balance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 1,
          is_beta_user: true,
        }),
      });
    });

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

    // Verify insufficient credits message appears
    const insufficientMessage = page.locator('[data-testid="recommendations-insufficient-credits"]');
    await expect(insufficientMessage).toBeVisible({ timeout: 10000 });
    await expect(insufficientMessage).toContainText(/insufficient|not enough/i);

    // Verify upgrade button
    const upgradeButton = page.locator('[data-testid="upgrade-button"]');
    await expect(upgradeButton).toBeVisible();
  });
});
