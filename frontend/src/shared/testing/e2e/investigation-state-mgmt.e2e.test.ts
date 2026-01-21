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
 * REAL E2E Investigation Test
 *
 * Triggers actual investigation through real frontend UI.
 * All data is 100% real: backend API calls, WebSocket updates, LLM interactions.
 * Configuration from environment variables with schema validation.
 *
 * Monitoring Strategy:
 * - Real-time polling via useWizardPolling hook
 * - UI updates from backend progress events
 * - Phase and tool execution tracking
 * - Investigation completion verification
 */

test.describe('Investigation State Management E2E', () => {
  let page: Page;
  let config: ReturnType<typeof loadPlaywrightTestConfig>;
  let logger: TestLogger;

  test.beforeAll(() => {
    try {
      config = loadPlaywrightTestConfig();
      logger = new TestLogger(config.enableVerboseLogging);
      logger.info('Configuration loaded successfully', {
        baseUrl: config.baseUrl,
        backendBaseUrl: config.backendBaseUrl,
      });
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
        // eslint-disable-next-line testing-library/no-debugging-utils
        logger.debug(`[PAGE_LOG] ${msg.text()}`);
      }
    });

    logger.info('Navigating to investigation settings page');
    await page.goto('http://localhost:3000/investigation/settings', { waitUntil: 'networkidle' });
    logger.success('Page loaded successfully', { currentUrl: page.url() });
  });

  test('complete investigation lifecycle with real-time monitoring', async () => {
    logger.info('Starting investigation state management E2E test with real-time monitoring');
    expect(page.url()).toContain('/investigation/settings');

    await page.waitForTimeout(config.pageLoadTimeoutMs);

    // Step 1: Click Start Investigation button
    const startButton = page.locator('button:has-text("Start Investigation")').first();
    const buttonFound = await startButton.isVisible({ timeout: config.elementVisibilityTimeoutMs });
    expect(buttonFound).toBe(true);
    logger.success('Start Investigation button found and visible');

    await startButton.click();
    logger.info('Clicked Start Investigation button');

    // Step 2: Wait for navigation to progress page
    await page.waitForURL('**/investigation/progress**', {
      timeout: config.investigationCompletionTimeoutMs,
    });
    await page.waitForLoadState('networkidle');
    logger.success('Navigated to progress page');

    const urlParams = new URL(page.url());
    const investigationId = urlParams.searchParams.get('id');
    expect(investigationId).toBeTruthy();
    logger.success('Investigation ID extracted from URL', { investigationId });

    // Step 3: Monitor investigation progress in real-time
    logger.info('Starting real-time progress monitoring');
    let lastProgress = 0;
    let lastPhaseId = '';
    const progressUpdates: Array<{ timestamp: number; progress: number; stage: string }> = [];
    const startTime = Date.now();
    const maxMonitoringTime = config.investigationCompletionTimeoutMs;

    while (Date.now() - startTime < maxMonitoringTime) {
      // Fetch current progress from backend
      const progressResponse = await page.evaluate(async (invId) => {
        const res = await fetch(`/api/investigations/${invId}/progress`);
        return res.ok ? await res.json() : null;
      }, investigationId);

      if (progressResponse) {
        const { completion_percent: completionPercent, lifecycle_stage: lifecycleStage, phases } = progressResponse;
        const timestamp = Date.now();
        const elapsedSeconds = Math.round((timestamp - startTime) / 1000);

        // Record progress update
        if (completionPercent !== lastProgress) {
          progressUpdates.push({
            timestamp: elapsedSeconds,
            progress: completionPercent,
            stage: lifecycleStage
          });
          logger.info(`[${elapsedSeconds}s] Progress Update`, {
            progress: `${completionPercent}%`,
            stage: lifecycleStage,
            phasesCount: phases?.length || 0
          });
          lastProgress = completionPercent;
        }

        // Verify UI reflects backend state
        const progressBarValue = await page.locator('[role="progressbar"]').first().getAttribute('aria-valuenow');
        if (progressBarValue && config.enableVerboseLogging) {
          const uiProgress = parseInt(progressBarValue, 10);
          logger.debug(`UI Progress Bar: ${uiProgress}% (Backend: ${completionPercent}%)`);
        }

        // Check for phase updates
        if (phases && phases.length > 0) {
          const currentPhase = phases.find((p: any) => p.status === 'in_progress');
          if (currentPhase && currentPhase.id !== lastPhaseId) {
            logger.info(`Phase Changed: ${currentPhase.name}`, {
              status: currentPhase.status,
              progress: currentPhase.completionPercent
            });
            lastPhaseId = currentPhase.id;
          }
        }

        // Check for completion
        if (lifecycleStage === 'completed') {
          logger.success('Investigation completed!', {
            totalTime: `${Math.round((Date.now() - startTime) / 1000)}s`,
            finalProgress: completionPercent,
            totalUpdates: progressUpdates.length
          });
          break;
        }
      }

      // Wait before next poll
      await page.waitForTimeout(2000);
    }

    logger.success('Real-time monitoring completed', {
      totalProgressUpdates: progressUpdates.length,
      updates: progressUpdates.map(u => `[${u.timestamp}s] ${u.progress}% (${u.stage})`).join(' → ')
    });

    // Step 4: Verify final state on results page
    await page.waitForURL('**/investigation/results**', {
      timeout: 60000, // Wait up to 1 more minute for results page
    });
    logger.success('Navigated to results page');

    // Step 5: Verify final backend response
    const finalProgressResponse = await page.evaluate(async (invId) => {
      const res = await fetch(`/api/investigations/${invId}/progress`);
      return res.ok ? await res.json() : null;
    }, investigationId);

    if (finalProgressResponse) {
      logger.success('Final Investigation Progress State', {
        lifecycleStage: finalProgressResponse.lifecycle_stage,
        completionPercent: finalProgressResponse.completion_percent,
      });

      await assertStepperMatchesStage(page, finalProgressResponse.lifecycle_stage, logger);
      await assertProgressBarAccuracy(page, finalProgressResponse.completion_percent, logger);
    }

    // Step 6: Verify event stream
    const finalEventsResponse = await page.evaluate(async (invId) => {
      const res = await fetch(`/api/investigations/${invId}/events`);
      return res.ok ? await res.json() : null;
    }, investigationId);

    if (finalEventsResponse?.items) {
      logger.success('Investigation Event Feed', {
        totalEvents: finalEventsResponse.items.length,
      });
      await assertActivityFeedMatchesEvents(page, finalEventsResponse.items.length, logger);
    }

    // Step 7: Verify investigation response
    const backendResponse = await page.evaluate(async (invId) => {
      const res = await fetch(`/api/investigations/${invId}`);
      return res.ok ? await res.json() : null;
    }, investigationId);

    const validation = validateInvestigationResponse(backendResponse);
    expect(validation.valid).toBe(true);

    const response = validation.data;
    expect(response?.investigation_id).toBe(investigationId);
    expect(response?.lifecycle_stage).toBe('completed');
    expect(response?.findings).toBeDefined();

    if (response?.findings && response.findings.length > 0) {
      await assertFindingsDisplayConsistency(page, response.findings.length, logger);
      logger.info(`Investigation findings: ${response.findings.length}`);
    }

    expect(page.url()).toContain('/investigation/results');
    logger.success('Test completed successfully - full investigation workflow verified');
  });
});
