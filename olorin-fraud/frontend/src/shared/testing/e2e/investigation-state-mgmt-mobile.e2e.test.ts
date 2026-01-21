/* eslint-disable testing-library/no-debugging-utils */
import { test, expect, Page } from '@playwright/test';
import { loadPlaywrightTestConfig } from '../config/playwright.config';
import { TestLogger } from '../utils/test-logger';
import { validateInvestigationResponse } from '../utils/investigation-schemas';
import {
  assertMobileResponsiveLayout,
  assertMobileTouchInteractions,
} from './utils/ui-assertions';

/**
 * Mobile E2E Investigation Test (US6)
 *
 * Tests investigation state management on mobile devices (375x667 viewport).
 * Verifies responsive layout and touch interaction handling.
 */

test.describe('Investigation State Management E2E - Mobile', () => {
  let page: Page;
  let config: ReturnType<typeof loadPlaywrightTestConfig>;
  let logger: TestLogger;

  test.beforeAll(() => {
    try {
      config = loadPlaywrightTestConfig();
      logger = new TestLogger(config.enableVerboseLogging);
      logger.info('Mobile test configuration loaded', {
        baseUrl: config.baseUrl,
      });
    } catch (error) {
      console.error('Failed to load test configuration:', error);
      throw error;
    }
  });

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
    });
    page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'log' && config.enableVerboseLogging) {
        logger.debug(`[PAGE_LOG] ${msg.text()}`);
      }
    });

    logger.info('Navigating to investigation settings (mobile)');
    await page.goto(`${config.baseUrl}/investigation/settings`, { waitUntil: 'networkidle' });
    logger.success('Mobile page loaded successfully');
  });

  test('investigation lifecycle on mobile with responsive layout', async () => {
    logger.info('Starting mobile E2E investigation test');
    expect(page.url()).toContain('/investigation/settings');

    await assertMobileResponsiveLayout(page, logger);
    await page.waitForTimeout(config.pageLoadTimeoutMs);

    const startButton = page.locator('button:has-text("Start Investigation")').first();
    await assertMobileTouchInteractions(page, 'button:has-text("Start Investigation")', logger);

    const buttonFound = await startButton.isVisible({ timeout: config.elementVisibilityTimeoutMs });
    expect(buttonFound).toBe(true);

    await startButton.click();
    await page.waitForLoadState('networkidle');

    const urlParams = new URL(page.url());
    const investigationId = urlParams.searchParams.get('id');
    expect(investigationId).toBeTruthy();

    logger.success('Investigation submitted on mobile', { investigationId });

    await page.waitForURL('**/investigation/results**', {
      timeout: config.investigationCompletionTimeoutMs,
    });

    await page.waitForLoadState('networkidle');

    const finalProgressResponse = await page.evaluate(async (invId) => {
      const res = await fetch(`/api/investigations/${invId}/progress`);
      return res.ok ? await res.json() : null;
    }, investigationId);

    expect(finalProgressResponse).toBeTruthy();
    expect(finalProgressResponse?.lifecycle_stage).toBe('completed');

    const backendResponse = await page.evaluate(async (invId) => {
      const res = await fetch(`/api/investigations/${invId}`);
      return res.ok ? await res.json() : null;
    }, investigationId);

    const validation = validateInvestigationResponse(backendResponse);
    expect(validation.valid).toBe(true);

    const response = validation.data;
    expect(response?.investigation_id).toBe(investigationId);
    expect(response?.lifecycle_stage).toBe('completed');

    await assertMobileResponsiveLayout(page, logger);

    expect(page.url()).toContain('/investigation/results');
    logger.success('Mobile test completed successfully');
  });
});
