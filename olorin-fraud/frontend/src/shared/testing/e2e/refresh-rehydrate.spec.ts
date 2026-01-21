/* eslint-disable testing-library/no-debugging-utils */
import { test, expect, Page } from '@playwright/test';
import { loadPlaywrightTestConfig } from '../config/playwright.config';
import { TestLogger } from '../utils/test-logger';
import { validateInvestigationResponse } from '../utils/investigation-schemas';

/**
 * Refresh and Rehydrate Test (US7)
 *
 * Verifies snapshot refresh and state rehydration:
 * 1. Snapshot loads quickly (< 2 seconds)
 * 2. Events catch-up after page refresh
 * 3. Complete state consistency after rehydration
 */

test.describe('Refresh and Rehydrate - US7', () => {
  let page: Page;
  let config: ReturnType<typeof loadPlaywrightTestConfig>;
  let logger: TestLogger;

  test.beforeAll(() => {
    try {
      config = loadPlaywrightTestConfig();
      logger = new TestLogger(config.enableVerboseLogging);
      logger.info('Refresh and rehydrate test configuration loaded');
    } catch (error) {
      console.error('Failed to load test configuration:', error);
      throw error;
    }
  });

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'log' && config.enableVerboseLogging) {
        logger.debug(`[PAGE_LOG] ${msg.text()}`);
      }
    });
    logger.info('Navigating to investigation settings page');
    await page.goto(`${config.baseUrl}/investigation/settings`, { waitUntil: 'networkidle' });
  });

  async function triggerInvestigation(): Promise<string> {
    await page.waitForTimeout(config.pageLoadTimeoutMs);
    const startButton = page.locator('button:has-text("Start Investigation")').first();
    await startButton.click();
    await page.waitForLoadState('networkidle');
    const urlParams = new URL(page.url());
    const investigationId = urlParams.searchParams.get('id');
    expect(investigationId).toBeTruthy();
    return investigationId as string;
  }

  test('should load snapshot quickly (< 2 seconds)', async () => {
    logger.info('Test 1: Snapshot load performance');

    const investigationId = await triggerInvestigation();

    await page.waitForURL('**/investigation/results**', {
      timeout: config.investigationCompletionTimeoutMs,
    });

    logger.success('Investigation completed', { investigationId });

    const startTime = Date.now();

    const snapshotResponse = await page.evaluate(async (invId) => {
      const res = await fetch(`/api/investigations/${invId}`);
      return res.ok ? await res.json() : null;
    }, investigationId);

    const loadTime = Date.now() - startTime;

    expect(snapshotResponse).toBeTruthy();
    expect(loadTime).toBeLessThan(2000);

    logger.success('Snapshot loaded within performance threshold', {
      loadTimeMs: loadTime,
      threshold: 2000,
    });
  });

  test('should catch up events after page refresh', async () => {
    logger.info('Test 2: Event catch-up after refresh');

    const investigationId = await triggerInvestigation();

    await page.waitForURL('**/investigation/results**', {
      timeout: config.investigationCompletionTimeoutMs,
    });

    const beforeRefreshResponse = await page.evaluate(async (invId) => {
      const res = await fetch(`/api/investigations/${invId}/events`);
      return res.ok ? await res.json() : null;
    }, investigationId);

    const beforeRefreshCount = beforeRefreshResponse?.items?.length || 0;
    logger.success('Events before refresh', { count: beforeRefreshCount });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(config.pageLoadTimeoutMs);

    const afterRefreshResponse = await page.evaluate(async (invId) => {
      const res = await fetch(`/api/investigations/${invId}/events`);
      return res.ok ? await res.json() : null;
    }, investigationId);

    const afterRefreshCount = afterRefreshResponse?.items?.length || 0;
    logger.success('Events after refresh', { count: afterRefreshCount });

    expect(afterRefreshCount).toBeGreaterThanOrEqual(beforeRefreshCount);
    logger.success('Event catch-up verified after refresh', {
      beforeCount: beforeRefreshCount,
      afterCount: afterRefreshCount,
    });
  });

  test('should maintain complete state consistency after rehydration', async () => {
    logger.info('Test 3: Complete state consistency after rehydration');

    const investigationId = await triggerInvestigation();

    await page.waitForURL('**/investigation/results**', {
      timeout: config.investigationCompletionTimeoutMs,
    });

    const beforeRefreshState = await page.evaluate(async (invId) => {
      const invRes = await fetch(`/api/investigations/${invId}`);
      const progRes = await fetch(`/api/investigations/${invId}/progress`);
      const evRes = await fetch(`/api/investigations/${invId}/events`);

      return {
        investigation: invRes.ok ? await invRes.json() : null,
        progress: progRes.ok ? await progRes.json() : null,
        eventCount: evRes.ok ? (await evRes.json()).items?.length || 0 : 0,
      };
    }, investigationId);

    logger.success('Pre-refresh state captured', {
      hasInvestigation: !!beforeRefreshState.investigation,
      stage: beforeRefreshState.progress?.lifecycle_stage,
      eventCount: beforeRefreshState.eventCount,
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(config.pageLoadTimeoutMs);

    const afterRefreshState = await page.evaluate(async (invId) => {
      const invRes = await fetch(`/api/investigations/${invId}`);
      const progRes = await fetch(`/api/investigations/${invId}/progress`);
      const evRes = await fetch(`/api/investigations/${invId}/events`);

      return {
        investigation: invRes.ok ? await invRes.json() : null,
        progress: progRes.ok ? await progRes.json() : null,
        eventCount: evRes.ok ? (await evRes.json()).items?.length || 0 : 0,
      };
    }, investigationId);

    logger.success('Post-refresh state captured', {
      hasInvestigation: !!afterRefreshState.investigation,
      stage: afterRefreshState.progress?.lifecycle_stage,
      eventCount: afterRefreshState.eventCount,
    });

    expect(afterRefreshState.investigation?.investigation_id).toBe(investigationId);
    expect(afterRefreshState.progress?.lifecycle_stage).toBe(
      beforeRefreshState.progress?.lifecycle_stage
    );
    expect(afterRefreshState.eventCount).toBeGreaterThanOrEqual(
      beforeRefreshState.eventCount
    );

    const validation = validateInvestigationResponse(afterRefreshState.investigation);
    expect(validation.valid).toBe(true);

    logger.success('State consistency verified after rehydration', {
      investigationId,
      stage: afterRefreshState.progress?.lifecycle_stage,
    });
  });
});
