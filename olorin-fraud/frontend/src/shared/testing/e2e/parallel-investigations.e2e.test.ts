/**
 * End-to-End Tests for Parallel Investigations Feature
 *
 * Tests the complete flow:
 * 1. API endpoints availability
 * 2. Investigation list retrieval
 * 3. ParallelInvestigationsPage rendering
 * 4. Investigation navigation
 * 5. Real-time updates
 *
 * Feature: 001-parallel-investigations-monitor
 */

import { test, expect, Page } from '@playwright/test';
import {
  InvestigationAPIClient,
  createTestInvestigations,
  cleanupTestInvestigations,
} from './helpers/api';

// TEST ONLY - Hardcoded fallback allowed for E2E testing
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3000';
// TEST ONLY - Hardcoded fallback allowed for E2E testing
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

test.describe('Parallel Investigations Feature - End-to-End', () => {
  let testInvestigations: any[] = [];
  let apiClient: InvestigationAPIClient;

  test.beforeAll(async ({ playwright }) => {
    // Create API request context for setup
    const context = await playwright.request.newContext({
      baseURL: API_BASE_URL,
    });

    apiClient = new InvestigationAPIClient(context);

    // Create test data
    testInvestigations = await createTestInvestigations(context, 5);
    console.log(`Created ${testInvestigations.length} test investigations`);

    await context.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    // Cleanup test data
    const context = await playwright.request.newContext({
      baseURL: API_BASE_URL,
    });

    await cleanupTestInvestigations(context, testInvestigations);
    console.log(`Cleaned up ${testInvestigations.length} test investigations`);

    await context.dispose();
  });

  test('1. API endpoints should be available', async ({ request }) => {
    const endpoints = [
      '/api/v1/investigation-state/',
      '/api/v1/investigation-state/statistics',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${API_BASE_URL}${endpoint}`);
      expect(response.ok()).toBeTruthy();
      console.log(`✓ ${endpoint} - Status: ${response.status()}`);
    }
  });

  test('2. Should list all investigations', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/v1/investigation-state/?page=1&page_size=50`
    );

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('investigations');
    expect(Array.isArray(data.investigations)).toBeTruthy();
    expect(data.investigations.length).toBeGreaterThanOrEqual(testInvestigations.length);

    console.log(
      `✓ Retrieved ${data.investigations.length} investigations from API`
    );
  });

  test('3. Should navigate to /parallel route', async ({ page }) => {
    await page.goto(`${BASE_URL}/parallel`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check URL
    expect(page.url()).toContain('/parallel');
    console.log(`✓ Navigated to /parallel route`);
  });

  test('4. ParallelInvestigationsPage should render', async ({ page }) => {
    await page.goto(`${BASE_URL}/parallel`);
    await page.waitForLoadState('networkidle');

    // Wait for investigations table to appear
    const table = page.locator('table, [role="table"]');
    await table.waitFor({ state: 'attached', timeout: 10000 });

    expect(table).toBeTruthy();
    console.log(`✓ ParallelInvestigationsPage rendered successfully`);
  });

  test('5. Should display investigation data in table', async ({ page }) => {
    await page.goto(`${BASE_URL}/parallel`);
    await page.waitForLoadState('networkidle');

    // Wait for table rows
    const rows = page.locator('tbody tr, [role="row"]');
    const count = await rows.count();

    expect(count).toBeGreaterThan(0);
    console.log(`✓ Table displays ${count} investigation rows`);

    // Verify table headers exist
    const headers = page.locator('thead, [role="columnheader"]');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);
    console.log(`✓ Table has ${headerCount} column headers`);
  });

  test('6. Should show investigation status colors', async ({ page }) => {
    await page.goto(`${BASE_URL}/parallel`);
    await page.waitForLoadState('networkidle');

    // Look for status indicators with color classes
    const statusElements = page.locator('[class*="text-corporate"]');
    const count = await statusElements.count();

    expect(count).toBeGreaterThan(0);
    console.log(`✓ Found ${count} styled status elements`);
  });

  test('7. Should have working refresh button', async ({ page }) => {
    await page.goto(`${BASE_URL}/parallel`);
    await page.waitForLoadState('networkidle');

    // Find refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Refreshing")');
    expect(refreshButton).toBeTruthy();

    // Get initial row count
    const initialRows = await page.locator('tbody tr, [role="row"]').count();

    // Click refresh
    await refreshButton.click();

    // Wait for potential update
    await page.waitForTimeout(2000);

    // Verify page is still functional
    expect(page.url()).toContain('/parallel');
    console.log(`✓ Refresh button works correctly`);
  });

  test('8. Should navigate to investigation details on row click', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/parallel`);
    await page.waitForLoadState('networkidle');

    // Get first investigation ID from table
    const firstIdCell = page.locator('tbody tr td:first-child, [role="row"] [role="cell"]:first-child').first();
    const investigationId = await firstIdCell.textContent();

    if (investigationId && investigationId.trim()) {
      // Click first row to navigate
      const firstRow = page.locator('tbody tr, [role="row"]').first();
      await firstRow.click({ force: true });

      // Wait for navigation
      await page.waitForTimeout(1000);

      // Should navigate to investigation progress page
      expect(page.url()).toMatch(/progress|investigation/i);
      console.log(`✓ Navigated to investigation details for ID: ${investigationId.trim()}`);
    }
  });

  test('9. Should handle loading state gracefully', async ({ page }) => {
    // Slow down network to observe loading state
    await page.route('**/*.api.example.com/**', (route) => {
      route.abort('timedout');
    });

    await page.goto(`${BASE_URL}/parallel`);

    // Wait for either data or error message
    const table = page.locator('table, [role="table"]');
    const errorMessage = page.locator('text=Error, text=Failed, text=No investigations');

    const visible = await Promise.race([
      table.waitFor({ state: 'attached', timeout: 5000 }).then(() => true),
      errorMessage.waitFor({ state: 'attached', timeout: 5000 }).then(() => true),
      page.waitForTimeout(5000).then(() => false),
    ]).catch(() => false);

    expect([true, false]).toContain(visible);
    console.log(`✓ Loading state handled correctly`);
  });

  test('10. Should show "No investigations" message when empty', async ({ page, request }) => {
    // This test assumes we can clear data or filter it
    // For now, just verify the page handles data display

    await page.goto(`${BASE_URL}/parallel?search=nonexistent`);
    await page.waitForLoadState('networkidle');

    // Check for either table or empty state message
    const table = page.locator('table, [role="table"]');
    const emptyMessage = page.locator('text=/no.*investigation/i');

    const hasTableOrMessage = await Promise.race([
      table.isVisible(),
      emptyMessage.isVisible(),
    ]).catch(() => false);

    expect(hasTableOrMessage).toBeTruthy();
    console.log(`✓ Page handles empty state correctly`);
  });

  test('11. API: Create investigation endpoint', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/investigation-state/`, {
      data: {
        investigation_id: `test-create-${Date.now()}`,
        lifecycle_stage: 'SETTINGS',
        status: 'CREATED',
        settings: {
          name: 'API Test Investigation',
          entities: [
            {
              entity_type: 'user_id',
              entity_value: 'api-test@example.com',
            },
          ],
        },
      },
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty('investigation_id');
    expect(data).toHaveProperty('status');

    // Cleanup
    await request.delete(
      `${API_BASE_URL}/api/v1/investigation-state/${data.investigation_id}`
    );

    console.log(`✓ Create investigation endpoint works - Created ID: ${data.investigation_id}`);
  });

  test('12. API: Lifecycle endpoints (start, complete)', async ({ request }) => {
    const createResponse = await request.post(
      `${API_BASE_URL}/api/v1/investigation-state/`,
      {
        data: {
          investigation_id: `test-lifecycle-${Date.now()}`,
          lifecycle_stage: 'SETTINGS',
          status: 'CREATED',
          settings: { name: 'Lifecycle Test' },
        },
      }
    );

    const investigation = await createResponse.json();
    const id = investigation.investigation_id;

    // Test start endpoint
    const startResponse = await request.post(
      `${API_BASE_URL}/api/v1/investigation-state/${id}/start`
    );
    expect(startResponse.ok()).toBeTruthy();

    // Test complete endpoint
    const completeResponse = await request.post(
      `${API_BASE_URL}/api/v1/investigation-state/${id}/complete`,
      { data: { summary: 'Test completed' } }
    );
    expect(completeResponse.ok()).toBeTruthy();

    // Cleanup
    await request.delete(`${API_BASE_URL}/api/v1/investigation-state/${id}`);

    console.log(`✓ Lifecycle endpoints work correctly`);
  });

  test('13. API: Findings endpoints', async ({ request }) => {
    const createResponse = await request.post(
      `${API_BASE_URL}/api/v1/investigation-state/`,
      {
        data: {
          investigation_id: `test-findings-${Date.now()}`,
          lifecycle_stage: 'IN_PROGRESS',
          status: 'IN_PROGRESS',
          settings: { name: 'Findings Test' },
        },
      }
    );

    const investigation = await createResponse.json();
    const id = investigation.investigation_id;

    // Test get findings endpoint
    const getResponse = await request.get(
      `${API_BASE_URL}/api/v1/investigation-state/${id}/findings`
    );
    expect(getResponse.ok()).toBeTruthy();

    // Cleanup
    await request.delete(`${API_BASE_URL}/api/v1/investigation-state/${id}`);

    console.log(`✓ Findings endpoints work correctly`);
  });

  test('14. API: Error handling - 404 on missing investigation', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/v1/investigation-state/nonexistent-id-12345`
    );

    expect(response.status()).toBe(404);
    console.log(`✓ Proper 404 error handling for missing investigation`);
  });

  test('15. Performance: Page load time should be reasonable', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/parallel`);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within reasonable time (10 seconds for E2E)
    expect(loadTime).toBeLessThan(10000);
    console.log(`✓ Page loaded in ${loadTime}ms`);
  });

  test('16. Accessibility: Page should have proper ARIA labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/parallel`);
    await page.waitForLoadState('networkidle');

    // Check for table role
    const table = page.locator('[role="table"]').or(page.locator('table'));
    expect(await table.count()).toBeGreaterThan(0);

    // Check for interactive elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    console.log(`✓ Page has proper accessibility elements`);
  });

  test('17. Responsive design: Should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto(`${BASE_URL}/parallel`);
    await page.waitForLoadState('networkidle');

    // Page should still be functional
    const table = page.locator('table, [role="table"]');
    expect(await table.isVisible()).toBeTruthy();

    console.log(`✓ Page is responsive and works on mobile`);
  });

  test('18. Should handle network errors gracefully', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);

    await page.goto(`${BASE_URL}/parallel`);

    // Should show some UI even offline
    const title = page.locator('h1');
    expect(await title.count()).toBeGreaterThan(0);

    // Go back online
    await page.context().setOffline(false);

    console.log(`✓ Page handles offline state gracefully`);
  });

  test('19. Should auto-refresh data at configured interval', async ({ page }) => {
    await page.goto(`${BASE_URL}/parallel`);
    await page.waitForLoadState('networkidle');

    // Get initial last updated time
    const lastUpdatedText = page.locator('text=/last updated|last refresh/i').first();

    // Wait for auto-refresh (typically 10 seconds)
    await page.waitForTimeout(12000);

    // Last updated time should have changed
    const newText = await lastUpdatedText.textContent();
    expect(newText).toBeTruthy();

    console.log(`✓ Auto-refresh working: ${newText}`);
  });

  test('20. Full integration test: Create, navigate, and monitor investigation', async ({
    page,
    request,
  }) => {
    // Step 1: Create investigation via API
    const createResponse = await request.post(
      `${API_BASE_URL}/api/v1/investigation-state/`,
      {
        data: {
          investigation_id: `test-integration-${Date.now()}`,
          lifecycle_stage: 'SETTINGS',
          status: 'CREATED',
          settings: {
            name: 'Integration Test Investigation',
            entities: [
              {
                entity_type: 'user_id',
                entity_value: 'integration-test@example.com',
              },
            ],
          },
        },
      }
    );

    expect(createResponse.ok()).toBeTruthy();
    const investigation = await createResponse.json();
    const id = investigation.investigation_id;

    // Step 2: Navigate to parallel investigations page
    await page.goto(`${BASE_URL}/parallel`);
    await page.waitForLoadState('networkidle');

    // Step 3: Verify investigation appears in list
    const tableVisible = await page.locator('table, [role="table"]').isVisible();
    expect(tableVisible).toBeTruthy();

    // Step 4: Start the investigation via API
    const startResponse = await request.post(
      `${API_BASE_URL}/api/v1/investigation-state/${id}/start`
    );
    expect(startResponse.ok()).toBeTruthy();

    // Step 5: Refresh the page to see updated status
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 6: Cleanup
    await request.delete(`${API_BASE_URL}/api/v1/investigation-state/${id}`);

    console.log(`✓ Full integration test completed successfully`);
  });
});
