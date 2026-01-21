/* eslint-disable testing-library/no-debugging-utils */
import { test, expect } from '@playwright/test';
import { loadPlaywrightTestConfig } from '../config/playwright.config';
import { TestLogger } from '../utils/test-logger';
import { BackoffConfig } from './utils/http-client';
import {
  verifyProgressMonotonicity,
  validateProgressPercentages,
} from './utils/progress-validators';
import {
  verifyEventsAppendOnly,
  verifyCombinedPolling,
} from './utils/events-validators';

/**
 * Progress and Events Verification Test (US3, US4)
 *
 * Verifies investigation state consistency:
 * 1. Progress monotonicity - completion percent never decreases
 * 2. Events append-only - events ordered by timestamp, no duplicates
 * 3. Combined polling - simultaneous progress and events polling
 */

test.describe('Verify Progress and Events - US3, US4', () => {
  let config: ReturnType<typeof loadPlaywrightTestConfig>;
  let logger: TestLogger;

  test.beforeAll(() => {
    try {
      config = loadPlaywrightTestConfig();
      logger = new TestLogger(config.enableVerboseLogging);
      logger.info('Progress and events test configuration loaded');
    } catch (error) {
      console.error('Failed to load test configuration:', error);
      throw error;
    }
  });

  test('should maintain progress monotonicity during investigation', async ({ browser }) => {
    logger.info('Test 1: Verify progress never decreases');

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${config.baseUrl}/investigation/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(config.pageLoadTimeoutMs);

    const startButton = page.locator('button:has-text("Start Investigation")').first();
    await startButton.click();
    await page.waitForLoadState('networkidle');

    const urlParams = new URL(page.url());
    const investigationId = urlParams.searchParams.get('id');
    expect(investigationId).toBeTruthy();

    const backoffConfig: BackoffConfig = {
      maxRetries: config.maxRetries,
      baseMs: config.backoffBaseMs,
      maxMs: config.backoffMaxMs,
    };

    const result = await verifyProgressMonotonicity(
      config.backendBaseUrl,
      investigationId as string,
      backoffConfig,
      logger,
      5,
      config.pollingIntervalMs
    );

    expect(result.valid).toBe(true);
    expect(validateProgressPercentages(result.snapshots)).toBe(true);
    logger.success('Progress monotonicity verified', { snapshots: result.snapshots });
  });

  test('should maintain events append-only ordering', async ({ browser }) => {
    logger.info('Test 2: Verify events append-only with proper ordering');

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${config.baseUrl}/investigation/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(config.pageLoadTimeoutMs);

    const startButton = page.locator('button:has-text("Start Investigation")').first();
    await startButton.click();
    await page.waitForLoadState('networkidle');

    const urlParams = new URL(page.url());
    const investigationId = urlParams.searchParams.get('id');
    expect(investigationId).toBeTruthy();

    const backoffConfig: BackoffConfig = {
      maxRetries: config.maxRetries,
      baseMs: config.backoffBaseMs,
      maxMs: config.backoffMaxMs,
    };

    const result = await verifyEventsAppendOnly(
      config.backendBaseUrl,
      investigationId as string,
      backoffConfig,
      logger,
      5,
      config.pollingIntervalMs
    );

    expect(result.valid).toBe(true);
    expect(result.uniqueEvents).toBeGreaterThan(0);
    logger.success('Events append-only verified', {
      uniqueEvents: result.uniqueEvents,
      eventCounts: result.eventCounts,
    });
  });

  test('should handle combined progress and events polling', async ({ browser }) => {
    logger.info('Test 3: Simultaneous progress and events polling');

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${config.baseUrl}/investigation/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(config.pageLoadTimeoutMs);

    const startButton = page.locator('button:has-text("Start Investigation")').first();
    await startButton.click();
    await page.waitForLoadState('networkidle');

    const urlParams = new URL(page.url());
    const investigationId = urlParams.searchParams.get('id');
    expect(investigationId).toBeTruthy();

    const backoffConfig: BackoffConfig = {
      maxRetries: config.maxRetries,
      baseMs: config.backoffBaseMs,
      maxMs: config.backoffMaxMs,
    };

    const result = await verifyCombinedPolling(
      config.backendBaseUrl,
      investigationId as string,
      backoffConfig,
      logger,
      3,
      config.pollingIntervalMs
    );

    expect(result.valid).toBe(true);
    logger.success('Combined polling test completed', { pollCount: result.pollCount });
  });
});
