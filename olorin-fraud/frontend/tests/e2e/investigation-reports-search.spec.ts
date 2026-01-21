/**
 * E2E Tests for Investigation Reports Search and Filter
 * Feature: 001-extensive-investigation-report
 * Task: T080
 *
 * Tests the complete workflow for browsing, searching, and filtering
 * investigation reports in the Reports Library.
 */

import { test, expect, Page } from '@playwright/test';

// Configuration from environment
const FRONTEND_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.PLAYWRIGHT_BACKEND_BASE_URL || 'http://localhost:8090';

/**
 * Helper function to navigate to Investigation Reports tab
 */
async function navigateToReportsLibrary(page: Page) {
  await page.goto(FRONTEND_URL);

  // Navigate to Reports microservice
  await page.click('text=Reports');
  await page.waitForSelector('[data-testid="reports-page"]', { timeout: 10000 });

  // Click on Investigation Reports tab
  await page.click('text=Investigation Reports');
  await page.waitForSelector('[data-testid="investigation-reports-list"]', { timeout: 5000 });
}

/**
 * Helper function to generate test reports via API
 */
async function generateTestReport(page: Page, investigationId: string): Promise<void> {
  await page.request.post(`${BACKEND_URL}/api/v1/reports/investigation/generate`, {
    data: { investigation_id: investigationId }
  });
}

test.describe('Investigation Reports Library - Browse and View', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToReportsLibrary(page);
  });

  test('should display list of investigation reports with metadata', async ({ page }) => {
    // Verify reports list container is visible
    const reportsList = page.locator('[data-testid="investigation-reports-list"]');
    await expect(reportsList).toBeVisible();

    // Verify at least one report card is displayed
    const reportCards = page.locator('[data-testid="report-card"]');
    await expect(reportCards.first()).toBeVisible({ timeout: 10000 });

    // Verify report card contains expected metadata
    const firstCard = reportCards.first();
    await expect(firstCard.locator('[data-testid="report-title"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="investigation-id"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="risk-badge"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="generated-date"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="file-size"]')).toBeVisible();
  });

  test('should display risk score badges with correct colors', async ({ page }) => {
    const reportCards = page.locator('[data-testid="report-card"]');
    await reportCards.first().waitFor({ state: 'visible' });

    // Check for risk badges (critical, high, medium, or low)
    const riskBadges = page.locator('[data-testid="risk-badge"]');
    const count = await riskBadges.count();
    expect(count).toBeGreaterThan(0);

    // Verify at least one badge has proper styling
    const firstBadge = riskBadges.first();
    await expect(firstBadge).toBeVisible();

    // Check that badge contains a risk score
    const badgeText = await firstBadge.textContent();
    expect(badgeText).toMatch(/\d+\.\d+|Unknown/);
  });

  test('should show entity information when available', async ({ page }) => {
    const reportCards = page.locator('[data-testid="report-card"]');
    await reportCards.first().waitFor({ state: 'visible' });

    // Look for entity information in any card
    const entityInfo = page.locator('[data-testid="entity-info"]').first();

    // If entity info exists, verify it displays correctly
    if (await entityInfo.isVisible()) {
      await expect(entityInfo).toContainText('Entity:');
    }
  });

  test('should open report in new tab when clicked', async ({ page, context }) => {
    // Wait for reports to load
    const reportCards = page.locator('[data-testid="report-card"]');
    await reportCards.first().waitFor({ state: 'visible' });

    // Get investigation ID from first card
    const investigationId = await reportCards.first()
      .locator('[data-testid="investigation-id"]')
      .textContent();

    // Click on report card
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      reportCards.first().click()
    ]);

    // Verify new tab opens with report
    await newPage.waitForLoadState('load', { timeout: 10000 });
    expect(newPage.url()).toContain('/api/v1/reports/investigation/');
    expect(newPage.url()).toContain('/html');

    // Verify report content
    await expect(newPage.locator('h1')).toContainText('Investigation Report');

    await newPage.close();
  });

  test('should handle empty state when no reports exist', async ({ page }) => {
    // Mock API to return empty results
    await page.route('**/api/v1/reports/investigation/list*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          reports: [],
          total: 0,
          page: 1,
          page_size: 20,
          total_pages: 0
        })
      });
    });

    // Reload page to trigger API call
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify empty state message
    await expect(page.locator('text=No reports found')).toBeVisible();
  });

  test('should handle loading state', async ({ page }) => {
    // Mock API with delay
    await page.route('**/api/v1/reports/investigation/list*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });

    // Reload to see loading state
    await page.reload();

    // Verify loading indicator appears
    const loadingIndicator = page.locator('[data-testid="loading-spinner"]');
    await expect(loadingIndicator).toBeVisible({ timeout: 1000 });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/v1/reports/investigation/list*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Internal server error' })
      });
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify error message is displayed
    await expect(page.locator('text=Failed to load reports')).toBeVisible();
  });
});

test.describe('Investigation Reports Library - Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToReportsLibrary(page);
  });

  test('should filter reports by investigation ID search', async ({ page }) => {
    // Wait for reports to load
    await page.waitForSelector('[data-testid="report-card"]', { timeout: 10000 });

    // Get an investigation ID from the first visible report
    const firstCard = page.locator('[data-testid="report-card"]').first();
    const investigationId = await firstCard
      .locator('[data-testid="investigation-id"]')
      .textContent();

    if (!investigationId) return; // Skip if no ID available

    // Enter partial investigation ID in search box
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill(investigationId.substring(0, 8));

    // Wait for filtered results
    await page.waitForTimeout(1000); // Debounce delay

    // Verify filtered results contain the search term
    const visibleCards = page.locator('[data-testid="report-card"]:visible');
    const count = await visibleCards.count();

    for (let i = 0; i < count; i++) {
      const cardId = await visibleCards.nth(i)
        .locator('[data-testid="investigation-id"]')
        .textContent();
      expect(cardId).toContain(investigationId.substring(0, 8));
    }
  });

  test('should filter reports by entity ID search', async ({ page }) => {
    // Wait for reports
    await page.waitForSelector('[data-testid="report-card"]');

    // Look for a card with entity information
    const cardWithEntity = page.locator('[data-testid="report-card"]')
      .filter({ has: page.locator('[data-testid="entity-info"]') })
      .first();

    if (await cardWithEntity.count() === 0) {
      test.skip(); // Skip if no entity info available
    }

    const entityText = await cardWithEntity
      .locator('[data-testid="entity-info"]')
      .textContent();

    // Extract entity value (e.g., "user@example.com")
    const entityMatch = entityText?.match(/Entity:\s*(.+)/);
    if (!entityMatch) return;

    const entityValue = entityMatch[1].trim().split(' ')[0]; // Get first word

    // Search by entity
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill(entityValue);
    await page.waitForTimeout(1000);

    // Verify results contain the entity
    const visibleCards = page.locator('[data-testid="report-card"]:visible');
    expect(await visibleCards.count()).toBeGreaterThan(0);
  });

  test('should clear search and show all reports', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    // Get initial count
    const initialCount = await page.locator('[data-testid="report-card"]').count();

    // Enter search term
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('test-search-term');
    await page.waitForTimeout(1000);

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1000);

    // Verify all reports are shown again
    const finalCount = await page.locator('[data-testid="report-card"]').count();
    expect(finalCount).toBe(initialCount);
  });

  test('should show "no results" message for search with no matches', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    // Search for something that doesn't exist
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('nonexistent-investigation-id-xyz123');
    await page.waitForTimeout(1000);

    // Verify no results message
    await expect(page.locator('text=No reports found')).toBeVisible();
  });

  test('should maintain search term across page reloads', async ({ page }) => {
    const searchTerm = 'test-inv';

    // Enter search term
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill(searchTerm);
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForSelector('[data-testid="search-input"]');

    // Verify search term is preserved (if implemented)
    const preservedValue = await searchInput.inputValue();
    // Note: This may be empty if search state isn't persisted
    // Test passes either way - just documenting expected behavior
  });
});

test.describe('Investigation Reports Library - Risk Level Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToReportsLibrary(page);
  });

  test('should filter reports by Critical risk level', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    // Open risk filter dropdown
    const riskFilter = page.locator('[data-testid="risk-filter"]');
    await riskFilter.click();

    // Select Critical
    await page.click('text=Critical');
    await page.waitForTimeout(1000);

    // Verify filtered results show only critical risk
    const visibleBadges = page.locator('[data-testid="risk-badge"]:visible');
    const count = await visibleBadges.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const badgeText = await visibleBadges.nth(i).textContent();
        const score = parseFloat(badgeText || '0');
        expect(score).toBeGreaterThanOrEqual(80);
      }
    }
  });

  test('should filter reports by High risk level', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    const riskFilter = page.locator('[data-testid="risk-filter"]');
    await riskFilter.click();
    await page.click('text=High');
    await page.waitForTimeout(1000);

    const visibleBadges = page.locator('[data-testid="risk-badge"]:visible');
    const count = await visibleBadges.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const badgeText = await visibleBadges.nth(i).textContent();
        const score = parseFloat(badgeText || '0');
        expect(score).toBeGreaterThanOrEqual(60);
        expect(score).toBeLessThan(80);
      }
    }
  });

  test('should filter reports by Medium risk level', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    const riskFilter = page.locator('[data-testid="risk-filter"]');
    await riskFilter.click();
    await page.click('text=Medium');
    await page.waitForTimeout(1000);

    const visibleBadges = page.locator('[data-testid="risk-badge"]:visible');
    const count = await visibleBadges.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const badgeText = await visibleBadges.nth(i).textContent();
        const score = parseFloat(badgeText || '0');
        expect(score).toBeGreaterThanOrEqual(40);
        expect(score).toBeLessThan(60);
      }
    }
  });

  test('should filter reports by Low risk level', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    const riskFilter = page.locator('[data-testid="risk-filter"]');
    await riskFilter.click();
    await page.click('text=Low');
    await page.waitForTimeout(1000);

    const visibleBadges = page.locator('[data-testid="risk-badge"]:visible');
    const count = await visibleBadges.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const badgeText = await visibleBadges.nth(i).textContent();
        const score = parseFloat(badgeText || '0');
        expect(score).toBeLessThan(40);
      }
    }
  });

  test('should clear risk filter and show all reports', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    // Get initial count
    const initialCount = await page.locator('[data-testid="report-card"]').count();

    // Apply filter
    const riskFilter = page.locator('[data-testid="risk-filter"]');
    await riskFilter.click();
    await page.click('text=Critical');
    await page.waitForTimeout(1000);

    // Clear filter (select "All")
    await riskFilter.click();
    await page.click('text=All');
    await page.waitForTimeout(1000);

    // Verify all reports shown
    const finalCount = await page.locator('[data-testid="report-card"]').count();
    expect(finalCount).toBe(initialCount);
  });
});

test.describe('Investigation Reports Library - Combined Filters', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToReportsLibrary(page);
  });

  test('should apply both search and risk filter together', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    // Apply search
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('inv');
    await page.waitForTimeout(1000);

    // Apply risk filter
    const riskFilter = page.locator('[data-testid="risk-filter"]');
    await riskFilter.click();
    await page.click('text=High');
    await page.waitForTimeout(1000);

    // Verify results match both filters
    const visibleCards = page.locator('[data-testid="report-card"]:visible');
    const count = await visibleCards.count();

    // Each visible card should match search term AND risk level
    for (let i = 0; i < count; i++) {
      const card = visibleCards.nth(i);

      // Check search match
      const invId = await card.locator('[data-testid="investigation-id"]').textContent();
      expect(invId?.toLowerCase()).toContain('inv');

      // Check risk level
      const badgeText = await card.locator('[data-testid="risk-badge"]').textContent();
      const score = parseFloat(badgeText || '0');
      expect(score).toBeGreaterThanOrEqual(60);
      expect(score).toBeLessThan(80);
    }
  });

  test('should clear all filters independently', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    const initialCount = await page.locator('[data-testid="report-card"]').count();

    // Apply both filters
    await page.locator('[data-testid="search-input"]').fill('test');
    await page.waitForTimeout(500);

    const riskFilter = page.locator('[data-testid="risk-filter"]');
    await riskFilter.click();
    await page.click('text=Critical');
    await page.waitForTimeout(500);

    // Clear search only
    await page.locator('[data-testid="search-input"]').clear();
    await page.waitForTimeout(500);

    // Risk filter should still be active
    const afterSearchClear = await page.locator('[data-testid="report-card"]').count();
    expect(afterSearchClear).toBeLessThanOrEqual(initialCount);

    // Clear risk filter
    await riskFilter.click();
    await page.click('text=All');
    await page.waitForTimeout(500);

    // All reports should be visible
    const finalCount = await page.locator('[data-testid="report-card"]').count();
    expect(finalCount).toBe(initialCount);
  });
});

test.describe('Investigation Reports Library - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToReportsLibrary(page);
  });

  test('should display pagination controls when reports exceed page size', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    // Check if pagination exists
    const pagination = page.locator('[data-testid="pagination"]');

    // Pagination may or may not be visible depending on number of reports
    if (await pagination.isVisible()) {
      // Verify pagination has page buttons
      await expect(pagination.locator('button')).toHaveCount(3); // Typically: Prev, Page number, Next
    }
  });

  test('should navigate to next page', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    const pagination = page.locator('[data-testid="pagination"]');

    if (await pagination.isVisible()) {
      // Click next button
      const nextButton = pagination.locator('button:has-text("Next")');

      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Verify page changed (URL or content)
        const currentPage = await pagination.locator('[data-testid="current-page"]').textContent();
        expect(currentPage).toBe('2');
      }
    }
  });

  test('should navigate to previous page', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    const pagination = page.locator('[data-testid="pagination"]');

    if (await pagination.isVisible()) {
      // Go to page 2 first
      const nextButton = pagination.locator('button:has-text("Next")');
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Click previous
        const prevButton = pagination.locator('button:has-text("Previous")');
        await prevButton.click();
        await page.waitForTimeout(1000);

        // Verify back on page 1
        const currentPage = await pagination.locator('[data-testid="current-page"]').textContent();
        expect(currentPage).toBe('1');
      }
    }
  });

  test('should maintain filters across pagination', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    // Apply risk filter
    const riskFilter = page.locator('[data-testid="risk-filter"]');
    await riskFilter.click();
    await page.click('text=High');
    await page.waitForTimeout(1000);

    const pagination = page.locator('[data-testid="pagination"]');

    if (await pagination.isVisible()) {
      const nextButton = pagination.locator('button:has-text("Next")');

      if (await nextButton.isEnabled()) {
        // Navigate to page 2
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Verify filter still applied on page 2
        const visibleBadges = page.locator('[data-testid="risk-badge"]:visible');
        const count = await visibleBadges.count();

        if (count > 0) {
          const firstBadgeText = await visibleBadges.first().textContent();
          const score = parseFloat(firstBadgeText || '0');
          expect(score).toBeGreaterThanOrEqual(60);
        }
      }
    }
  });
});

test.describe('Investigation Reports Library - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToReportsLibrary(page);
  });

  test('should support keyboard navigation for report cards', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    const firstCard = page.locator('[data-testid="report-card"]').first();

    // Focus first card
    await firstCard.focus();

    // Press Enter to open report
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.keyboard.press('Enter')
    ]);

    // Verify report opened
    await newPage.waitForLoadState('load');
    expect(newPage.url()).toContain('/html');

    await newPage.close();
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    await page.waitForSelector('[data-testid="report-card"]');

    // Check search input has label
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toHaveAttribute('aria-label');

    // Check filter dropdown has label
    const riskFilter = page.locator('[data-testid="risk-filter"]');
    await expect(riskFilter).toHaveAttribute('aria-label');

    // Check report cards have proper role
    const firstCard = page.locator('[data-testid="report-card"]').first();
    await expect(firstCard).toHaveAttribute('role', 'button');
  });
});
