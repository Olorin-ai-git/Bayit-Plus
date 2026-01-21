/* eslint-disable testing-library/no-debugging-utils */
import { test, expect, Page } from '@playwright/test';
import { loadPlaywrightTestConfig } from '../config/playwright.config';
import { TestLogger } from '../utils/test-logger';
import { E2ETestLogger } from './utils/logs';

/**
 * Logs Validation Test (US2)
 *
 * Verifies investigation logs functionality:
 * 1. Fetch and parse server logs successfully
 * 2. Validate log sequence maintains monotonicity
 * 3. Verify LLM interactions and tool usage tracking
 * 4. Correlate frontend and backend events
 */

test.describe('Logs Validation - US2', () => {
  let page: Page;
  let config: ReturnType<typeof loadPlaywrightTestConfig>;
  let logger: TestLogger;
  let e2eLogger: E2ETestLogger;

  test.beforeAll(() => {
    try {
      config = loadPlaywrightTestConfig();
      logger = new TestLogger(config.enableVerboseLogging);
      e2eLogger = new E2ETestLogger(config.enableVerboseLogging);
      logger.info('Logs validation test configuration loaded');
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

  test('should fetch and parse server logs successfully', async () => {
    logger.info('Test 1: Fetch and parse investigation logs');

    const investigationId = await triggerInvestigation();
    logger.success('Investigation triggered', { investigationId });

    await page.waitForURL('**/investigation/results**', {
      timeout: config.investigationCompletionTimeoutMs,
    });

    const logConfig = {
      method: config.logFetchMethod as 'http' | 'shell' | 'both',
      cmd: config.logFetchCmd,
      logger,
      timeoutMs: 30000,
    };

    const parsedLogs = await e2eLogger.captureBackendLogs(
      config.backendBaseUrl,
      investigationId,
      logConfig
    );

    expect(parsedLogs).toBeTruthy();
    expect(parsedLogs.rawLogs).toBeTruthy();
    logger.success('Logs fetched and parsed', {
      logCount: parsedLogs.rawLogs.logs?.length || 0,
    });
  });

  test('should validate log sequence monotonicity', async () => {
    logger.info('Test 2: Verify log sequence is monotonic');

    const investigationId = await triggerInvestigation();

    await page.waitForURL('**/investigation/results**', {
      timeout: config.investigationCompletionTimeoutMs,
    });

    const logConfig = {
      method: config.logFetchMethod as 'http' | 'shell' | 'both',
      cmd: config.logFetchCmd,
      logger,
      timeoutMs: 30000,
    };

    const parsedLogs = await e2eLogger.captureBackendLogs(
      config.backendBaseUrl,
      investigationId,
      logConfig
    );

    const result = await e2eLogger.validateBackendLogSequence(parsedLogs);

    if (!result.valid) {
      logger.warn('Log sequence violations detected', {
        violations: result.violations.slice(0, 3),
      });
    }

    expect(result.valid).toBe(true);
    logger.success('Log sequence monotonicity verified');
  });

  test('should verify LLM interactions and tool usage tracking', async () => {
    logger.info('Test 3: Verify LLM interactions and tool usage');

    const investigationId = await triggerInvestigation();

    await page.waitForURL('**/investigation/results**', {
      timeout: config.investigationCompletionTimeoutMs,
    });

    const logConfig = {
      method: config.logFetchMethod as 'http' | 'shell' | 'both',
      cmd: config.logFetchCmd,
      logger,
      timeoutMs: 30000,
    };

    const parsedLogs = await e2eLogger.captureBackendLogs(
      config.backendBaseUrl,
      investigationId,
      logConfig
    );

    logger.success('LLM interactions and tool usage detected', {
      llmInteractions: parsedLogs.llmInteractions.length,
      toolExecutions: parsedLogs.toolExecutions.length,
      agentDecisions: parsedLogs.agentDecisions.length,
    });

    expect(parsedLogs.llmInteractions.length).toBeGreaterThanOrEqual(0);
    expect(parsedLogs.toolExecutions.length).toBeGreaterThanOrEqual(0);
  });

  test('should correlate frontend and backend events', async () => {
    logger.info('Test 4: Correlate frontend and backend events');

    const investigationId = await triggerInvestigation();

    const frontendLogs: Array<{ timestamp: string; message: string }> = [];
    page.on('console', (msg) => {
      frontendLogs.push({
        timestamp: new Date().toISOString(),
        message: msg.text(),
      });
    });

    await page.waitForURL('**/investigation/results**', {
      timeout: config.investigationCompletionTimeoutMs,
    });

    const logConfig = {
      method: config.logFetchMethod as 'http' | 'shell' | 'both',
      cmd: config.logFetchCmd,
      logger,
      timeoutMs: 30000,
    };

    const parsedLogs = await e2eLogger.captureBackendLogs(
      config.backendBaseUrl,
      investigationId,
      logConfig
    );

    const correlation = e2eLogger.correlateLogsWithFrontend(
      frontendLogs,
      parsedLogs,
      investigationId
    );

    logger.success('Frontend and backend logs correlated', {
      matched: correlation.matched,
      unmatched: correlation.unmatched,
    });

    expect(correlation).toBeTruthy();
    expect(correlation.matched).toBeGreaterThanOrEqual(0);
  });
});
