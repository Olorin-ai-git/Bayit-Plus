/* eslint-disable testing-library/no-debugging-utils */
import { test, expect, Page } from '@playwright/test';
import { loadPlaywrightTestConfig } from '../config/playwright.config';
import { TestLogger } from '../utils/test-logger';
import { validateInvestigationResponse } from '../utils/investigation-schemas';
import {
  assertStepperMatchesStage,
  assertProgressBarAccuracy,
  assertActivityFeedMatchesEvents,
  assertFindingsDisplayConsistency,
} from './utils/ui-assertions';

/**
 * UI Reflects Backend Test (US1, US6)
 *
 * Verifies UI components display backend data correctly:
 * 1. Stepper component shows correct progress stage
 * 2. Progress bar accuracy matches API (±5%)
 * 3. Activity feed displays event timeline
 * 4. Findings display matches investigation results
 */

test.describe('Verify UI Reflects Backend - US1, US6', () => {
  let page: Page;
  let config: ReturnType<typeof loadPlaywrightTestConfig>;
  let logger: TestLogger;

  test.beforeAll(() => {
    try {
      config = loadPlaywrightTestConfig();
      logger = new TestLogger(config.enableVerboseLogging);
      logger.info('UI backend reflection test configuration loaded');
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

  async function triggerAndWaitForCompletion(): Promise<string> {
    expect(page.url()).toContain('/investigation/settings');
    await page.waitForTimeout(config.pageLoadTimeoutMs);
    const startButton = page.locator('button:has-text("Start Investigation")').first();
    await startButton.click();
    await page.waitForLoadState('networkidle');
    const urlParams = new URL(page.url());
    const investigationId = urlParams.searchParams.get('id');
    expect(investigationId).toBeTruthy();
    await page.waitForURL('**/investigation/results**', {
      timeout: config.investigationCompletionTimeoutMs,
    });
    return investigationId as string;
  }

  test('should display stepper matching progress stage', async () => {
    logger.info('Test 1: Stepper component reflects progress stage');
    const investigationId = await triggerAndWaitForCompletion();
    const finalProgressResponse = await page.evaluate(
      async (invId) => {
        const res = await fetch(`/api/investigations/${invId}/progress`);
        return res.ok ? await res.json() : null;
      },
      investigationId
    );
    expect(finalProgressResponse).toBeTruthy();
    await assertStepperMatchesStage(page, finalProgressResponse?.lifecycle_stage, logger);
    expect(page.url()).toContain('/investigation/results');
  });

  test('should display progress bar with backend accuracy', async () => {
    logger.info('Test 2: Progress bar accuracy matches backend');
    const investigationId = await triggerAndWaitForCompletion();
    const finalProgressResponse = await page.evaluate(
      async (invId) => {
        const res = await fetch(`/api/investigations/${invId}/progress`);
        return res.ok ? await res.json() : null;
      },
      investigationId
    );
    const expectedPercent = finalProgressResponse?.completion_percent || 0;
    expect(expectedPercent).toBeGreaterThanOrEqual(0);
    expect(expectedPercent).toBeLessThanOrEqual(100);
    await assertProgressBarAccuracy(page, expectedPercent, logger);
  });

  test('should display activity feed matching events', async () => {
    logger.info('Test 3: Activity feed matches backend events');
    const investigationId = await triggerAndWaitForCompletion();
    const finalEventsResponse = await page.evaluate(
      async (invId) => {
        const res = await fetch(`/api/investigations/${invId}/events`);
        return res.ok ? await res.json() : null;
      },
      investigationId
    );
    expect(finalEventsResponse?.items).toBeTruthy();
    const eventCount = finalEventsResponse?.items?.length || 0;
    await assertActivityFeedMatchesEvents(page, eventCount, logger);
    expect(page.url()).toContain('/investigation/results');
  });

  test('should display findings matching investigation results', async () => {
    logger.info('Test 4: Findings display matches investigation snapshot');
    const investigationId = await triggerAndWaitForCompletion();
    const backendResponse = await page.evaluate(
      async (invId) => {
        const res = await fetch(`/api/investigations/${invId}`);
        return res.ok ? await res.json() : null;
      },
      investigationId
    );
    const validation = validateInvestigationResponse(backendResponse);
    expect(validation.valid).toBe(true);
    const response = validation.data;
    expect(response?.findings).toBeDefined();
    const findingsCount = response?.findings?.length || 0;
    await assertFindingsDisplayConsistency(page, findingsCount, logger);
    expect(page.url()).toContain('/investigation/results');
  });
});
