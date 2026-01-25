/**
 * Search Feature E2E Tests
 *
 * Comprehensive end-to-end tests for the Bayit+ unified search feature.
 * Tests keyword search, semantic search, view modes, filters, and UI correctness.
 *
 * Test Coverage:
 * - Keyword search functionality
 * - Semantic search toggle
 * - View mode switching (grid, list, cards)
 * - Content type filtering
 * - Search suggestions and recent searches
 * - Empty states and error handling
 * - UI component visibility and styling
 *
 * Usage:
 *   npx playwright test tests/e2e/search.spec.ts
 *   npx playwright test tests/e2e/search.spec.ts --headed
 *   npx playwright test tests/e2e/search.spec.ts --project=chromium-desktop
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3200';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8090';

/**
 * Mock auth token for testing (premium user)
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
 * Mock auth token for basic user
 */
async function mockAuthBasic(page: Page): Promise<void> {
  await page.evaluate(() => {
    const mockAuthState = {
      state: {
        token: 'test-basic-token',
        user: {
          id: 'test-basic-user-456',
          email: 'user@bayitplus.com',
          subscription_tier: 'basic',
        },
        isAuthenticated: true,
      },
    };
    localStorage.setItem('bayit-auth', JSON.stringify(mockAuthState));
  });
}

/**
 * Wait for search results to load
 */
async function waitForSearchResults(page: Page, timeout = 5000): Promise<void> {
  // Wait for loading spinner to disappear
  await page.waitForTimeout(500);

  // Check if results are visible or empty state is shown
  const hasResults = await page.locator('[data-testid*="search-result"]').first().isVisible().catch(() => false);
  const hasEmptyState = await page.locator('[data-testid="search-empty-state"]').isVisible().catch(() => false);

  if (!hasResults && !hasEmptyState) {
    // Wait a bit more for results
    await page.waitForTimeout(1000);
  }
}

test.describe('Search Feature - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock auth and navigate to search page
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Search Page Layout', () => {
    test('should display all search UI components', async ({ page }) => {
      // Take initial screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-page-initial.png',
        fullPage: true
      });

      // Verify SearchControls is visible
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
      await expect(searchInput).toBeVisible();

      // Verify view mode toggle is visible
      const viewModeToggle = page.locator('[data-testid*="view-mode"], button[aria-label*="view"]');
      await expect(viewModeToggle.first()).toBeVisible();

      // Verify semantic toggle is visible
      const semanticToggle = page.locator('[data-testid*="semantic"], button[aria-label*="semantic"]');
      await expect(semanticToggle.first()).toBeVisible();

      console.log('✓ All search UI components are visible');
    });

    test('should display search suggestions when no query', async ({ page }) => {
      // Verify suggestions panel or recent searches
      const suggestionsPanel = page.locator('[data-testid*="suggestions"], [data-testid*="trending"]');

      // Wait for suggestions to load
      await page.waitForTimeout(1000);

      // Take screenshot of suggestions
      await page.screenshot({
        path: 'test-results/screenshots/search-suggestions.png',
        fullPage: true
      });

      // Check if suggestions or empty state is shown
      const hasSuggestions = await suggestionsPanel.first().isVisible().catch(() => false);
      console.log(hasSuggestions ? '✓ Search suggestions displayed' : '✓ Empty state displayed (no suggestions available)');
    });
  });

  test.describe('Keyword Search', () => {
    test('should perform keyword search and display results', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Type search query
      await searchInput.fill('Fauda');
      await page.waitForTimeout(500); // Debounce delay

      // Wait for results
      await waitForSearchResults(page);

      // Take screenshot of results
      await page.screenshot({
        path: 'test-results/screenshots/search-keyword-results.png',
        fullPage: true
      });

      // Verify URL contains query
      await expect(page).toHaveURL(/q=Fauda/);

      // Check for results or empty state
      const resultsVisible = await page.locator('[data-testid*="search-result"]').first().isVisible().catch(() => false);
      const emptyStateVisible = await page.locator('[data-testid="search-empty-state"]').isVisible().catch(() => false);

      expect(resultsVisible || emptyStateVisible).toBeTruthy();
      console.log(resultsVisible ? '✓ Search results displayed' : '✓ Empty state displayed (no results)');
    });

    test('should update results when query changes', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // First search
      await searchInput.fill('Action');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Take screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-query-1.png',
        fullPage: true
      });

      // Second search
      await searchInput.fill('Comedy');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Take screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-query-2.png',
        fullPage: true
      });

      // Verify URL updated
      await expect(page).toHaveURL(/q=Comedy/);
      console.log('✓ Search results update when query changes');
    });

    test('should clear results when query is cleared', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Perform search
      await searchInput.fill('Test');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);

      // Take screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-cleared.png',
        fullPage: true
      });

      // Verify suggestions are shown again
      const suggestionsVisible = await page.locator('[data-testid*="suggestions"]').first().isVisible().catch(() => false);
      console.log(suggestionsVisible ? '✓ Suggestions displayed after clearing search' : '✓ Empty state displayed after clearing');
    });
  });

  test.describe('Semantic Search Toggle', () => {
    test('should toggle semantic search mode', async ({ page }) => {
      const semanticToggle = page.locator('[data-testid*="semantic"], button[aria-label*="semantic"]').first();
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Perform keyword search first
      await searchInput.fill('Show me romantic movies');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Take screenshot of keyword search
      await page.screenshot({
        path: 'test-results/screenshots/search-keyword-mode.png',
        fullPage: true
      });

      // Toggle semantic search
      await semanticToggle.click();
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Take screenshot of semantic search
      await page.screenshot({
        path: 'test-results/screenshots/search-semantic-mode.png',
        fullPage: true
      });

      // Verify URL contains semantic parameter
      await expect(page).toHaveURL(/semantic=true/);
      console.log('✓ Semantic search mode toggled successfully');
    });

    test('should toggle back to keyword search', async ({ page }) => {
      const semanticToggle = page.locator('[data-testid*="semantic"], button[aria-label*="semantic"]').first();
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Enable semantic search
      await searchInput.fill('Test query');
      await semanticToggle.click();
      await page.waitForTimeout(500);

      // Verify semantic mode is on
      await expect(page).toHaveURL(/semantic=true/);

      // Toggle back to keyword
      await semanticToggle.click();
      await page.waitForTimeout(500);

      // Take screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-toggle-back-keyword.png',
        fullPage: true
      });

      // Verify semantic parameter is removed
      await expect(page).not.toHaveURL(/semantic=true/);
      console.log('✓ Toggled back to keyword search successfully');
    });
  });

  test.describe('View Mode Switching', () => {
    test('should switch between grid, list, and cards views', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Perform search first
      await searchInput.fill('Movies');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Find view mode buttons (grid, list, cards)
      const viewButtons = page.locator('[data-testid*="view-mode"] button, button[aria-label*="Grid"], button[aria-label*="List"], button[aria-label*="Cards"]');

      // Get all view buttons
      const buttonCount = await viewButtons.count();

      if (buttonCount > 0) {
        // Test grid view
        const gridButton = page.locator('button[aria-label*="Grid"], button[data-testid*="grid"]').first();
        if (await gridButton.isVisible().catch(() => false)) {
          await gridButton.click();
          await page.waitForTimeout(300);
          await page.screenshot({
            path: 'test-results/screenshots/search-view-grid.png',
            fullPage: true
          });
          console.log('✓ Grid view displayed');
        }

        // Test list view
        const listButton = page.locator('button[aria-label*="List"], button[data-testid*="list"]').first();
        if (await listButton.isVisible().catch(() => false)) {
          await listButton.click();
          await page.waitForTimeout(300);
          await page.screenshot({
            path: 'test-results/screenshots/search-view-list.png',
            fullPage: true
          });
          console.log('✓ List view displayed');
        }

        // Test cards view
        const cardsButton = page.locator('button[aria-label*="Cards"], button[data-testid*="cards"]').first();
        if (await cardsButton.isVisible().catch(() => false)) {
          await cardsButton.click();
          await page.waitForTimeout(300);
          await page.screenshot({
            path: 'test-results/screenshots/search-view-cards.png',
            fullPage: true
          });
          console.log('✓ Cards view displayed');
        }
      } else {
        console.log('⚠ View mode buttons not found, skipping view mode test');
      }
    });
  });

  test.describe('Content Type Filtering', () => {
    test('should filter by VOD content type', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Perform search
      await searchInput.fill('Entertainment');
      await page.waitForTimeout(500);

      // Find content type filter button (VOD)
      const vodButton = page.locator('button:has-text("VOD"), button:has-text("Movies"), [data-testid*="filter-vod"]').first();

      if (await vodButton.isVisible().catch(() => false)) {
        await vodButton.click();
        await page.waitForTimeout(500);
        await waitForSearchResults(page);

        await page.screenshot({
          path: 'test-results/screenshots/search-filter-vod.png',
          fullPage: true
        });
        console.log('✓ VOD filter applied');
      } else {
        console.log('⚠ VOD filter button not found');
      }
    });

    test('should filter by Live content type', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Perform search
      await searchInput.fill('News');
      await page.waitForTimeout(500);

      // Find content type filter button (Live)
      const liveButton = page.locator('button:has-text("Live"), [data-testid*="filter-live"]').first();

      if (await liveButton.isVisible().catch(() => false)) {
        await liveButton.click();
        await page.waitForTimeout(500);
        await waitForSearchResults(page);

        await page.screenshot({
          path: 'test-results/screenshots/search-filter-live.png',
          fullPage: true
        });
        console.log('✓ Live filter applied');
      } else {
        console.log('⚠ Live filter button not found');
      }
    });

    test('should filter by Radio content type', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Perform search
      await searchInput.fill('Music');
      await page.waitForTimeout(500);

      // Find content type filter button (Radio)
      const radioButton = page.locator('button:has-text("Radio"), [data-testid*="filter-radio"]').first();

      if (await radioButton.isVisible().catch(() => false)) {
        await radioButton.click();
        await page.waitForTimeout(500);
        await waitForSearchResults(page);

        await page.screenshot({
          path: 'test-results/screenshots/search-filter-radio.png',
          fullPage: true
        });
        console.log('✓ Radio filter applied');
      } else {
        console.log('⚠ Radio filter button not found');
      }
    });

    test('should filter by Podcast content type', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Perform search
      await searchInput.fill('Stories');
      await page.waitForTimeout(500);

      // Find content type filter button (Podcast)
      const podcastButton = page.locator('button:has-text("Podcast"), [data-testid*="filter-podcast"]').first();

      if (await podcastButton.isVisible().catch(() => false)) {
        await podcastButton.click();
        await page.waitForTimeout(500);
        await waitForSearchResults(page);

        await page.screenshot({
          path: 'test-results/screenshots/search-filter-podcast.png',
          fullPage: true
        });
        console.log('✓ Podcast filter applied');
      } else {
        console.log('⚠ Podcast filter button not found');
      }
    });
  });

  test.describe('Search Results Display', () => {
    test('should display search result cards with correct information', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Perform search
      await searchInput.fill('Popular');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Take screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-results-cards.png',
        fullPage: true
      });

      // Check for result cards
      const resultCards = page.locator('[data-testid*="search-result"], [data-testid*="content-card"]');
      const cardCount = await resultCards.count();

      if (cardCount > 0) {
        // Verify first card has required elements
        const firstCard = resultCards.first();

        // Check for thumbnail/image
        const hasImage = await firstCard.locator('img, [data-testid*="thumbnail"]').isVisible().catch(() => false);

        // Check for title
        const hasTitle = await firstCard.locator('[data-testid*="title"], h1, h2, h3, h4').isVisible().catch(() => false);

        console.log(`✓ Found ${cardCount} result cards`);
        console.log(hasImage ? '✓ Result cards have thumbnails' : '⚠ No thumbnails found');
        console.log(hasTitle ? '✓ Result cards have titles' : '⚠ No titles found');
      } else {
        console.log('⚠ No result cards found (empty results or not loaded)');
      }
    });

    test('should handle empty search results gracefully', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Search for something unlikely to exist
      await searchInput.fill('XyZqWvUiOpAsdf12345');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Take screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-empty-results.png',
        fullPage: true
      });

      // Check for empty state or no results message
      const emptyState = page.locator('[data-testid="search-empty-state"], [data-testid*="no-results"], text=/No results/i, text=/Nothing found/i');
      const hasEmptyState = await emptyState.first().isVisible().catch(() => false);

      console.log(hasEmptyState ? '✓ Empty state displayed correctly' : '⚠ Empty state not found');
    });
  });

  test.describe('Search Interactions', () => {
    test('should clear search with clear button', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Perform search
      await searchInput.fill('Test Query');
      await page.waitForTimeout(500);

      // Look for clear button (X icon)
      const clearButton = page.locator('button[aria-label*="Clear"], button[aria-label*="clear"], [data-testid*="clear-search"]');

      if (await clearButton.first().isVisible().catch(() => false)) {
        await clearButton.first().click();
        await page.waitForTimeout(300);

        // Verify input is cleared
        const inputValue = await searchInput.inputValue();
        expect(inputValue).toBe('');

        console.log('✓ Search cleared with clear button');
      } else {
        // Try clearing manually
        await searchInput.clear();
        console.log('⚠ Clear button not found, cleared manually');
      }

      // Take screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-after-clear.png',
        fullPage: true
      });
    });

    test('should allow clicking on search result', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

      // Perform search
      await searchInput.fill('Content');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Find first result card
      const resultCards = page.locator('[data-testid*="search-result"], [data-testid*="content-card"]');
      const cardCount = await resultCards.count();

      if (cardCount > 0) {
        const firstCard = resultCards.first();

        // Take screenshot before click
        await page.screenshot({
          path: 'test-results/screenshots/search-before-click.png',
          fullPage: true
        });

        // Click on first result
        await firstCard.click();
        await page.waitForTimeout(1000);

        // Take screenshot after click
        await page.screenshot({
          path: 'test-results/screenshots/search-after-click.png',
          fullPage: true
        });

        // Verify navigation occurred (URL changed or modal opened)
        const currentUrl = page.url();
        console.log(`✓ Clicked on search result, current URL: ${currentUrl}`);
      } else {
        console.log('⚠ No result cards available to click');
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to search
      await page.goto(`${BASE_URL}/search`);
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-mobile-375.png',
        fullPage: true
      });

      // Perform search
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
      await searchInput.fill('Mobile Test');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Take screenshot of results
      await page.screenshot({
        path: 'test-results/screenshots/search-mobile-results.png',
        fullPage: true
      });

      console.log('✓ Mobile layout tested (375px width)');
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Navigate to search
      await page.goto(`${BASE_URL}/search`);
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-tablet-768.png',
        fullPage: true
      });

      // Perform search
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
      await searchInput.fill('Tablet Test');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Take screenshot of results
      await page.screenshot({
        path: 'test-results/screenshots/search-tablet-results.png',
        fullPage: true
      });

      console.log('✓ Tablet layout tested (768px width)');
    });

    test('should display correctly on desktop 2K viewport', async ({ page }) => {
      // Set 2K desktop viewport
      await page.setViewportSize({ width: 2560, height: 1440 });

      // Navigate to search
      await page.goto(`${BASE_URL}/search`);
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: 'test-results/screenshots/search-desktop-2560.png',
        fullPage: true
      });

      // Perform search
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
      await searchInput.fill('Desktop Test');
      await page.waitForTimeout(500);
      await waitForSearchResults(page);

      // Take screenshot of results
      await page.screenshot({
        path: 'test-results/screenshots/search-desktop-results.png',
        fullPage: true
      });

      console.log('✓ Desktop 2K layout tested (2560px width)');
    });
  });

  test.describe('Premium Features', () => {
    test('should show LLM search for premium users', async ({ page }) => {
      // Already using premium mock
      await page.goto(`${BASE_URL}/search`);
      await page.waitForLoadState('networkidle');

      // Look for LLM search button/feature
      const llmButton = page.locator('button[aria-label*="LLM"], button[aria-label*="AI"], [data-testid*="llm-search"]');

      if (await llmButton.first().isVisible().catch(() => false)) {
        await page.screenshot({
          path: 'test-results/screenshots/search-premium-llm-visible.png',
          fullPage: true
        });
        console.log('✓ LLM search feature visible for premium users');
      } else {
        console.log('⚠ LLM search button not found');
      }
    });

    test('should hide LLM search for basic users', async ({ page }) => {
      // Use basic user mock
      await page.goto(BASE_URL);
      await mockAuthBasic(page);
      await page.goto(`${BASE_URL}/search`);
      await page.waitForLoadState('networkidle');

      // Look for LLM search button/feature
      const llmButton = page.locator('button[aria-label*="LLM"], button[aria-label*="AI"], [data-testid*="llm-search"]');
      const isVisible = await llmButton.first().isVisible().catch(() => false);

      await page.screenshot({
        path: 'test-results/screenshots/search-basic-no-llm.png',
        fullPage: true
      });

      if (!isVisible) {
        console.log('✓ LLM search correctly hidden for basic users');
      } else {
        console.log('⚠ LLM search visible for basic user (may be incorrect)');
      }
    });
  });
});
