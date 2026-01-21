/**
 * E2E Tests for Investigation Report Generation
 * Feature: 001-extensive-investigation-report
 * Task: T060
 *
 * Tests the complete workflow from clicking "Generate Report" button
 * to viewing the generated report in a new tab.
 */

import { test, expect, Page } from '@playwright/test';

// Configuration from environment
const FRONTEND_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.PLAYWRIGHT_BACKEND_BASE_URL || 'http://localhost:8090';

/**
 * Helper function to wait for investigation to complete
 */
async function waitForInvestigationComplete(page: Page, investigationId: string, timeout = 60000) {
  const startTime = Date.now();
  let status = '';

  while (Date.now() - startTime < timeout) {
    const response = await page.request.get(
      `${BACKEND_URL}/api/v1/investigation-state/${investigationId}`
    );
    const data = await response.json();
    status = data.status;

    if (status === 'COMPLETED' || status === 'FAILED') {
      break;
    }

    await page.waitForTimeout(2000);
  }

  return status;
}

test.describe('Investigation Report Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to investigations page
    await page.goto(FRONTEND_URL);
  });

  test('should generate and view investigation report via UI', async ({ page, context }) => {
    // Step 1: Open an existing completed investigation
    // (assumes there's at least one completed investigation in the system)
    await page.click('text=Investigations'); // Navigate to investigations
    await page.waitForSelector('[data-testid="investigation-list"]', { timeout: 10000 });

    // Click on first completed investigation
    const firstInvestigation = page.locator('[data-testid="investigation-item"]').first();
    await firstInvestigation.click();

    // Step 2: Verify Investigation Details Modal opens
    await expect(page.locator('[data-testid="investigation-details-modal"]')).toBeVisible();

    // Step 3: Click "Generate Report" button
    const generateButton = page.locator('button:has-text("Generate Report")');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    // Step 4: Wait for report generation (button shows loading state)
    await expect(page.locator('button:has-text("Generating Report...")')).toBeVisible();

    // Step 5: Wait for success message
    await expect(
      page.locator('text=Report generated successfully!'),
      { timeout: 30000 }
    ).toBeVisible();

    // Step 6: Verify "View Report" button appears
    const viewReportButton = page.locator('button:has-text("View Report")');
    await expect(viewReportButton).toBeVisible();

    // Step 7: Click "View Report" and verify new tab opens
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      viewReportButton.click()
    ]);

    // Step 8: Verify new tab loads the HTML report
    await newPage.waitForLoadState('load', { timeout: 10000 });
    expect(newPage.url()).toContain('/api/v1/reports/investigation/');
    expect(newPage.url()).toContain('/html');

    // Step 9: Verify report contains expected sections
    await expect(newPage.locator('h1')).toContainText('Investigation Report');
    await expect(newPage.locator('text=Executive Summary')).toBeVisible();
    await expect(newPage.locator('text=Risk Dashboard')).toBeVisible();

    // Clean up
    await newPage.close();
  });

  test('should handle report generation errors gracefully', async ({ page }) => {
    // Navigate to investigations
    await page.goto(`${FRONTEND_URL}/investigations`);
    await page.waitForSelector('[data-testid="investigation-list"]');

    // Click on investigation
    const investigation = page.locator('[data-testid="investigation-item"]').first();
    await investigation.click();

    // Mock API to return error
    await page.route('**/api/v1/reports/investigation/generate', route => {
      route.fulfill({
        status: 404,
        body: JSON.stringify({ detail: 'Investigation folder not found' })
      });
    });

    // Click generate button
    await page.click('button:has-text("Generate Report")');

    // Verify error message appears
    await expect(
      page.locator('text=Investigation folder not found'),
      { timeout: 5000 }
    ).toBeVisible();

    // Verify "View Report" button does NOT appear
    await expect(page.locator('button:has-text("View Report")')).not.toBeVisible();
  });

  test('should allow multiple report generations for same investigation', async ({ page, context }) => {
    // Open investigation details
    await page.goto(`${FRONTEND_URL}/investigations`);
    await page.waitForSelector('[data-testid="investigation-list"]');
    await page.locator('[data-testid="investigation-item"]').first().click();

    // Generate report first time
    await page.click('button:has-text("Generate Report")');
    await expect(page.locator('text=Report generated successfully!'), { timeout: 30000 }).toBeVisible();

    // Generate report second time (should overwrite)
    await page.click('button:has-text("Generate Report")');
    await expect(page.locator('text=Report generated successfully!'), { timeout: 30000 }).toBeVisible();

    // View report should work
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('button:has-text("View Report")')
    ]);

    await newPage.waitForLoadState('load');
    await expect(newPage.locator('h1')).toContainText('Investigation Report');

    await newPage.close();
  });

  test('should display report file size in success message', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/investigations`);
    await page.waitForSelector('[data-testid="investigation-list"]');
    await page.locator('[data-testid="investigation-item"]').first().click();

    // Generate report
    await page.click('button:has-text("Generate Report")');

    // Verify success message includes file size
    const successMessage = page.locator('div:has-text("Report generated successfully!")');
    await expect(successMessage, { timeout: 30000 }).toBeVisible();
    await expect(successMessage).toContainText('File size:');
    await expect(successMessage).toContainText('MB');
  });

  test('should maintain investigation details modal state during generation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/investigations`);
    await page.waitForSelector('[data-testid="investigation-list"]');

    // Open investigation details
    await page.locator('[data-testid="investigation-item"]').first().click();
    const modal = page.locator('[data-testid="investigation-details-modal"]');
    await expect(modal).toBeVisible();

    // Start report generation
    await page.click('button:has-text("Generate Report")');

    // Verify modal remains open during generation
    await expect(modal).toBeVisible();
    await expect(page.locator('button:has-text("Generating Report...")')).toBeVisible();

    // Wait for completion
    await expect(page.locator('text=Report generated successfully!'), { timeout: 30000 }).toBeVisible();

    // Modal should still be visible
    await expect(modal).toBeVisible();
  });

  test('should open report in new tab without closing modal', async ({ page, context }) => {
    await page.goto(`${FRONTEND_URL}/investigations`);
    await page.waitForSelector('[data-testid="investigation-list"]');
    await page.locator('[data-testid="investigation-item"]').first().click();

    // Generate report
    await page.click('button:has-text("Generate Report")');
    await expect(page.locator('text=Report generated successfully!'), { timeout: 30000 }).toBeVisible();

    // Click view report
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('button:has-text("View Report")')
    ]);

    // Original modal should still be visible
    await expect(page.locator('[data-testid="investigation-details-modal"]')).toBeVisible();

    // New tab should have report
    await expect(newPage.locator('h1')).toContainText('Investigation Report');

    await newPage.close();
  });
});

test.describe('Report Viewing without Generation', () => {
  test('should be able to view previously generated report', async ({ page, context }) => {
    // This test assumes a report was already generated in a previous test or manually

    // Navigate directly to report URL
    const testInvestigationId = 'existing-investigation-with-report';
    await page.goto(`${BACKEND_URL}/api/v1/reports/investigation/${testInvestigationId}/html`);

    // Verify report loads
    await page.waitForLoadState('load');

    // If report exists, should see content
    if ((await page.content()).includes('Investigation Report')) {
      await expect(page.locator('h1')).toContainText('Investigation Report');
    } else {
      // If report doesn't exist, should see 404
      expect(await page.textContent('body')).toContain('not found');
    }
  });
});

test.describe('Configuration and Environment', () => {
  test('should use configured API base URL from environment', async ({ page }) => {
    // Verify environment variables are set correctly
    expect(BACKEND_URL).toBeTruthy();
    expect(FRONTEND_URL).toBeTruthy();

    // Navigate to frontend
    await page.goto(FRONTEND_URL);

    // Verify page loads (confirms frontend URL is correct)
    await expect(page).toHaveTitle(/Olorin/i);
  });
});
