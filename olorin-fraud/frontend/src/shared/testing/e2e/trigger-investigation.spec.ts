/* eslint-disable testing-library/no-debugging-utils */
import { test, expect, Page } from '@playwright/test';
import { loadPlaywrightTestConfig } from '../config/playwright.config';
import { TestLogger } from '../utils/test-logger';
import { fetchProgress, BackoffConfig } from './utils/http-client';

/**
 * Trigger Investigation Test (US3)
 *
 * Verifies investigation trigger flow:
 * 1. Navigate to settings page
 * 2. Submit investigation form with valid data
 * 3. Extract investigation ID from response/URL
 * 4. Verify initial progress response from backend
 * 5. Confirm progress indicates "in_progress" or "initializing" lifecycle stage
 */

test.describe('Trigger Investigation - US3', () => {
  let page: Page;
  let config: ReturnType<typeof loadPlaywrightTestConfig>;
  let logger: TestLogger;

  test.beforeAll(() => {
    try {
      config = loadPlaywrightTestConfig();
      logger = new TestLogger(config.enableVerboseLogging);
      logger.info('Trigger investigation test configuration loaded');
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
    logger.success('Settings page loaded');
  });

  test('should trigger investigation and extract investigation ID', async () => {
    logger.info('Test 1: Navigate and submit investigation form');

    expect(page.url()).toContain('/investigation/settings');
    logger.success('On investigation settings page');

    await page.waitForTimeout(config.pageLoadTimeoutMs);

    const startButton = page.locator('button:has-text("Start Investigation")').first();
    const buttonFound = await startButton.isVisible({ timeout: config.elementVisibilityTimeoutMs });
    expect(buttonFound).toBe(true);
    logger.success('Start Investigation button found and visible');

    const isDisabled = await startButton.isDisabled();
    expect(isDisabled).toBe(false);
    logger.success('Button is enabled and clickable');

    await startButton.click();
    logger.success('Button clicked');

    await page.waitForLoadState('networkidle');
    logger.success('Page settled after click');

    const urlParams = new URL(page.url());
    const investigationId = urlParams.searchParams.get('id');

    expect(investigationId).toBeTruthy();
    expect(investigationId).toMatch(/^[a-zA-Z0-9\-_]+$/);
    logger.success('Investigation ID extracted from URL', { investigationId });
  });

  test('should verify initial progress response after trigger', async () => {
    logger.info('Test 2: Submit investigation and verify initial progress');

    expect(page.url()).toContain('/investigation/settings');
    await page.waitForTimeout(config.pageLoadTimeoutMs);

    const startButton = page.locator('button:has-text("Start Investigation")').first();
    await startButton.click();
    await page.waitForLoadState('networkidle');

    const urlParams = new URL(page.url());
    const investigationId = urlParams.searchParams.get('id');
    expect(investigationId).toBeTruthy();

    logger.success('Investigation triggered', { investigationId });

    const backoffConfig: BackoffConfig = {
      maxRetries: config.maxRetries,
      baseMs: config.backoffBaseMs,
      maxMs: config.backoffMaxMs,
    };

    const progressResponse = await fetchProgress(
      { backendBaseUrl: config.backendBaseUrl },
      investigationId as string,
      backoffConfig,
      logger
    );

    expect(progressResponse).toBeTruthy();
    logger.success('Initial progress response received', {
      status: progressResponse?.status,
      lifecycleStage: progressResponse?.lifecycle_stage,
    });

    expect(progressResponse?.investigation_id).toBe(investigationId);
    expect(['initializing', 'in_progress', 'completed']).toContain(
      progressResponse?.lifecycle_stage
    );

    expect(progressResponse?.completion_percent).toBeGreaterThanOrEqual(0);
    expect(progressResponse?.completion_percent).toBeLessThanOrEqual(100);

    logger.success('Initial progress state validated', {
      completionPercent: progressResponse?.completion_percent,
      stage: progressResponse?.lifecycle_stage,
    });

    expect(page.url()).toContain('/progress');
    logger.success('Navigated to progress page after trigger');
  });
});
