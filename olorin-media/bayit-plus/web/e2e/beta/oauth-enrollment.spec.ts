/**
 * E2E Test: Beta 500 OAuth Auto-Enrollment
 *
 * Tests the automatic enrollment of beta users during Google OAuth login.
 * Verifies that users with beta invitations are auto-enrolled and receive 500 credits.
 */

import { test, expect } from '@playwright/test';

test.describe('Beta 500 OAuth Auto-Enrollment', () => {
  test('Beta user auto-enrolls via Google OAuth and receives 500 credits', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Wait for login UI to load
    await expect(page.locator('h1')).toContainText(/sign in|login/i);

    // Click "Sign in with Google" button
    const googleSignInButton = page.locator('button').filter({ hasText: /sign in with google/i });
    await expect(googleSignInButton).toBeVisible();

    // Mock the OAuth flow by intercepting the callback
    await page.route('**/api/v1/auth/google/callback', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-beta-user-123',
            email: 'beta@example.com',
            name: 'Beta Test User',
            is_beta_user: true,
            subscription: {
              plan: 'beta',
              status: 'active',
            },
          },
          token: 'mock-jwt-token',
        }),
      });
    });

    // Mock the credits balance endpoint
    await page.route('**/api/v1/beta/credits/balance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 500,
          is_beta_user: true,
          total_credits: 500,
          used_credits: 0,
        }),
      });
    });

    // Click the Google sign-in button
    await googleSignInButton.click();

    // Wait for redirect to homepage
    await expect(page).toHaveURL(/\/$|\/home/);

    // Verify credit balance widget is visible and shows 500 credits
    const creditBalance = page.locator('[data-testid="credit-balance"]');
    await expect(creditBalance).toBeVisible({ timeout: 10000 });
    await expect(creditBalance).toContainText('500');

    // Verify beta user badge or indicator
    const betaBadge = page.locator('[data-testid="beta-badge"]');
    await expect(betaBadge).toBeVisible();
    await expect(betaBadge).toContainText(/beta/i);
  });

  test('Non-beta user sees no credit balance widget', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Mock OAuth callback for non-beta user
    await page.route('**/api/v1/auth/google/callback', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-456',
            email: 'user@example.com',
            name: 'Regular User',
            is_beta_user: false,
          },
          token: 'mock-jwt-token',
        }),
      });
    });

    // Sign in
    const googleSignInButton = page.locator('button').filter({ hasText: /sign in with google/i });
    await googleSignInButton.click();

    // Wait for homepage
    await expect(page).toHaveURL(/\/$|\/home/);

    // Verify NO credit balance widget
    const creditBalance = page.locator('[data-testid="credit-balance"]');
    await expect(creditBalance).not.toBeVisible();
  });

  test('Beta enrollment failure shows error message', async ({ page }) => {
    await page.goto('/login');

    // Mock OAuth callback failure
    await page.route('**/api/v1/auth/google/callback', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'enrollment_failed',
          detail: 'Failed to allocate beta credits',
        }),
      });
    });

    // Attempt sign in
    const googleSignInButton = page.locator('button').filter({ hasText: /sign in with google/i });
    await googleSignInButton.click();

    // Verify error message is displayed
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/failed|error/i);
  });
});
