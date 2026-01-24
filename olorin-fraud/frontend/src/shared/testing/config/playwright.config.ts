import { z } from 'zod';

/**
 * Environment variables documentation:
 *
 * Optional (with defaults):
 * - PLAYWRIGHT_TEST_BASE_URL: Frontend base URL (default: http://localhost:3000)
 * - PLAYWRIGHT_BACKEND_BASE_URL: Backend API URL (default: http://localhost:8090)
 *
 * Timeouts (milliseconds):
 * - PLAYWRIGHT_ELEMENT_VISIBILITY_TIMEOUT_MS: Element visibility (default: 10000)
 * - PLAYWRIGHT_PAGE_LOAD_TIMEOUT_MS: Page load (default: 2000)
 * - PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS: Investigation lifecycle (default: 300000)
 * - PLAYWRIGHT_POLLING_INTERVAL_MS: Polling interval (default: 1000)
 * - PLAYWRIGHT_PROGRESS_LOG_INTERVAL_MS: Progress logging interval (default: 10000)
 *
 * Retry & Resilience:
 * - PLAYWRIGHT_MAX_RETRIES: Max API retry attempts (default: 3, min: 1, max: 10)
 * - PLAYWRIGHT_BACKOFF_BASE_MS: Initial backoff delay (default: 100, min: 10, max: 1000)
 * - PLAYWRIGHT_BACKOFF_MAX_MS: Maximum backoff delay (default: 10000, min: 1000, max: 60000)
 *
 * Log Fetching:
 * - PLAYWRIGHT_LOG_FETCH_METHOD: 'http', 'shell', or 'both' (default: 'both')
 * - PLAYWRIGHT_LOG_FETCH_CMD: Shell command for logs (optional, e.g., 'docker logs backend-container | grep {investigationId}')
 * - PLAYWRIGHT_SKIP_SERVER_LOG_ASSERTIONS: Skip if logs unavailable (default: false)
 *
 * Debugging:
 * - PLAYWRIGHT_ENABLE_VERBOSE_LOGGING: Enable debug logging (default: false)
 * - PLAYWRIGHT_ENABLE_PERFORMANCE_METRICS: Collect performance metrics (default: true)
 * - PLAYWRIGHT_ENABLE_RESULT_VALIDATION: Validate results (default: true)
 * - PLAYWRIGHT_MAX_BUTTONS_TO_DEBUG: Buttons to log (default: 10)
 * - PLAYWRIGHT_MAX_FINDINGS_TO_LOG: Findings to log (default: 5)
 * - PLAYWRIGHT_MAX_TEXT_TRUNCATE_LENGTH: Text truncation length (default: 100)
 */

export const PlaywrightTestConfigSchema = z.object({
  baseUrl: z.string().url('PLAYWRIGHT_TEST_BASE_URL must be a valid URL').default('http://localhost:3000'),
  backendBaseUrl: z.string().url('PLAYWRIGHT_BACKEND_BASE_URL must be a valid URL').default('http://localhost:8090'),

  // Timeouts
  elementVisibilityTimeoutMs: z.coerce.number().int().positive().default(10000),
  pageLoadTimeoutMs: z.coerce.number().int().positive().default(2000),
  investigationCompletionTimeoutMs: z.coerce.number().int().positive().default(300000),
  pollingIntervalMs: z.coerce.number().int().positive().default(1000),
  progressLogIntervalMs: z.coerce.number().int().positive().default(10000),

  // Retry & Resilience
  maxRetries: z.coerce.number().int().min(1).max(10).default(3),
  backoffBaseMs: z.coerce.number().int().min(10).max(1000).default(100),
  backoffMaxMs: z.coerce.number().int().min(1000).max(60000).default(10000),

  // Log Fetching
  logFetchMethod: z.enum(['http', 'shell', 'both']).default('both'),
  logFetchCmd: z.string().optional(),
  skipServerLogAssertions: z.boolean().default(false),

  // Debugging
  maxButtonsToDebug: z.coerce.number().int().positive().default(10),
  maxFindingsToLog: z.coerce.number().int().positive().default(5),
  maxTextTruncateLength: z.coerce.number().int().positive().default(100),
  enableVerboseLogging: z.boolean().default(false),
  enablePerformanceMetrics: z.boolean().default(true),
  enableResultValidation: z.boolean().default(true),
});

export type PlaywrightTestConfig = z.infer<typeof PlaywrightTestConfigSchema>;

export function loadPlaywrightTestConfig(): PlaywrightTestConfig {
  const parsed = PlaywrightTestConfigSchema.safeParse({
    // URLs - provide defaults if not set
    // TEST ONLY - Hardcoded fallback allowed for testing infrastructure
    baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    // TEST ONLY - Hardcoded fallback allowed for testing infrastructure
    backendBaseUrl: process.env.PLAYWRIGHT_BACKEND_BASE_URL || 'http://localhost:8090',

    // Timeouts
    elementVisibilityTimeoutMs: process.env.PLAYWRIGHT_ELEMENT_VISIBILITY_TIMEOUT_MS,
    pageLoadTimeoutMs: process.env.PLAYWRIGHT_PAGE_LOAD_TIMEOUT_MS,
    investigationCompletionTimeoutMs: process.env.PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS,
    pollingIntervalMs: process.env.PLAYWRIGHT_POLLING_INTERVAL_MS,
    progressLogIntervalMs: process.env.PLAYWRIGHT_PROGRESS_LOG_INTERVAL_MS,

    // Retry & Resilience
    maxRetries: process.env.PLAYWRIGHT_MAX_RETRIES,
    backoffBaseMs: process.env.PLAYWRIGHT_BACKOFF_BASE_MS,
    backoffMaxMs: process.env.PLAYWRIGHT_BACKOFF_MAX_MS,

    // Log Fetching
    logFetchMethod: process.env.PLAYWRIGHT_LOG_FETCH_METHOD,
    logFetchCmd: process.env.PLAYWRIGHT_LOG_FETCH_CMD,
    skipServerLogAssertions: process.env.PLAYWRIGHT_SKIP_SERVER_LOG_ASSERTIONS === 'true',

    // Debugging
    maxButtonsToDebug: process.env.PLAYWRIGHT_MAX_BUTTONS_TO_DEBUG,
    maxFindingsToLog: process.env.PLAYWRIGHT_MAX_FINDINGS_TO_LOG,
    maxTextTruncateLength: process.env.PLAYWRIGHT_MAX_TEXT_TRUNCATE_LENGTH,
    enableVerboseLogging: process.env.PLAYWRIGHT_ENABLE_VERBOSE_LOGGING === 'true',
    enablePerformanceMetrics: process.env.PLAYWRIGHT_ENABLE_PERFORMANCE_METRICS !== 'false',
    enableResultValidation: process.env.PLAYWRIGHT_ENABLE_RESULT_VALIDATION !== 'false',
  });

  if (!parsed.success) {
    console.error('❌ Invalid Playwright Test Configuration:');
    console.error(parsed.error.format());
    throw new Error(
      `Invalid Playwright test configuration. Please check your environment variables or use the defaults (http://localhost:3000 and http://localhost:8090)`
    );
  }

  if (parsed.data.logFetchMethod !== 'http' && !parsed.data.logFetchCmd && parsed.data.logFetchMethod === 'shell') {
    throw new Error(
      'PLAYWRIGHT_LOG_FETCH_CMD must be specified when PLAYWRIGHT_LOG_FETCH_METHOD is "shell"'
    );
  }

  if (parsed.data.enableVerboseLogging) {
    console.log('✅ Playwright Test Configuration loaded successfully');
    console.log(`   Base URL: ${parsed.data.baseUrl}`);
    console.log(`   Backend URL: ${parsed.data.backendBaseUrl}`);
    console.log(`   Max Retries: ${parsed.data.maxRetries}`);
    console.log(`   Backoff Base: ${parsed.data.backoffBaseMs}ms`);
    console.log(`   Backoff Max: ${parsed.data.backoffMaxMs}ms`);
    console.log(`   Log Fetch Method: ${parsed.data.logFetchMethod}`);
  }

  return parsed.data;
}
