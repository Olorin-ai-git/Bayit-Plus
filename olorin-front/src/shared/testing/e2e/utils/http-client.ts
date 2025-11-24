import { TestLogger } from '../../testing/utils/test-logger';
import { ProgressData, EventData, EventsResponse, InvestigationLogs, ApiConfig } from './types';

/**
 * Configuration for exponential backoff retry strategy
 */
export interface BackoffConfig {
  maxRetries: number;
  baseMs: number;
  maxMs: number;
  jitterFactor?: number;
}

/**
 * Cached snapshot with versioning information
 */
interface CachedSnapshot<T> {
  data: T;
  etag: string | null;
  lastModified: string | null;
  timestamp: number;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const authToken = process.env.PLAYWRIGHT_AUTH_TOKEN;
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

export function getConfig(): ApiConfig {
  const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
  const backendBaseUrl = process.env.PLAYWRIGHT_BACKEND_BASE_URL;
  const timeoutMs = parseInt(process.env.PLAYWRIGHT_REQUEST_TIMEOUT_MS || '30000', 10);

  if (!baseUrl) throw new Error('PLAYWRIGHT_TEST_BASE_URL not configured');
  if (!backendBaseUrl) throw new Error('PLAYWRIGHT_BACKEND_BASE_URL not configured');

  return { baseUrl, backendBaseUrl, timeoutMs };
}

/**
 * Execute a function with exponential backoff retry strategy
 * Retries only on transient errors: 429, 503, 504
 * Fails immediately on non-transient 4xx errors (except 429)
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: BackoffConfig,
  logger?: TestLogger
): Promise<T> {
  const { maxRetries, baseMs, maxMs, jitterFactor = 0.1 } = config;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const statusCode = extractStatusCode(error);
      const isTransient = isTransientError(statusCode);

      if (attempt === maxRetries || !isTransient) {
        logger?.error('Request failed', { attempt, statusCode, error: String(error) });
        throw error;
      }

      const delay = calculateExponentialDelay(attempt, baseMs, maxMs, jitterFactor);
      logger?.warn(`Transient error (${statusCode}), retrying`, {
        attempt: attempt + 1,
        maxRetries,
        delayMs: delay,
      });

      await sleep(delay);
    }
  }
}

/**
 * Extract HTTP status code from error
 */
function extractStatusCode(error: unknown): number | null {
  if (error instanceof Response) {
    return error.status;
  }
  const errorStr = String(error);
  const match = errorStr.match(/(\d{3})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Determine if error is transient (retryable)
 */
function isTransientError(statusCode: number | null): boolean {
  return statusCode === 429 || statusCode === 503 || statusCode === 504;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateExponentialDelay(
  attempt: number,
  baseMs: number,
  maxMs: number,
  jitterFactor: number
): number {
  const exponentialDelay = baseMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxMs);
  const jitter = Math.random() * (cappedDelay * jitterFactor);
  return cappedDelay + jitter;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build If-None-Match header for ETag caching
 */
export function buildIfNoneMatchHeader(etag: string | null): Record<string, string> {
  if (!etag) return {};
  return { 'If-None-Match': etag };
}

export async function fetchProgress(
  config: { backendBaseUrl: string; timeoutMs?: number },
  investigationId: string,
  backoffConfig?: BackoffConfig,
  logger?: TestLogger
): Promise<ProgressData> {
  const url = `${config.backendBaseUrl}/api/investigations/${investigationId}/progress`;
  logger?.debug('Fetching progress', { url });

  const fetchFn = async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(config.timeoutMs || 30000),
    });

    if (!response.ok) throw new Error(`${response.status}`);

    const data = await response.json();
    logger?.debug('Progress retrieved', {
      stage: (data as Record<string, unknown>).lifecycle_stage,
      percent: (data as Record<string, unknown>).completion_percent,
    });
    return data;
  };

  if (backoffConfig) {
    return withExponentialBackoff(fetchFn, backoffConfig, logger);
  }
  return fetchFn();
}

export async function fetchEvents(
  config: { backendBaseUrl: string; timeoutMs?: number },
  investigationId: string,
  since?: string,
  limit?: number,
  backoffConfig?: BackoffConfig,
  logger?: TestLogger
): Promise<EventsResponse> {
  const params = new URLSearchParams();
  if (since) params.append('since', since);
  if (limit) params.append('limit', String(limit));

  const url = `${config.backendBaseUrl}/api/investigations/${investigationId}/events?${params}`;
  logger?.debug('Fetching events', { url });

  const fetchFn = async () => {
    const headers = await getAuthHeaders();
    const etagHeaders = buildIfNoneMatchHeader(null);
    const response = await fetch(url, {
      headers: { ...headers, ...etagHeaders },
      signal: AbortSignal.timeout(config.timeoutMs || 30000),
    });

    if (response.status === 304) {
      logger?.debug('Events not modified (304)');
      return { items: [], next_cursor: null, has_more: false } as EventsResponse;
    }

    if (!response.ok) throw new Error(`${response.status}`);

    const data = await response.json();
    logger?.debug('Events retrieved', {
      count: (data as Record<string, unknown>).items?.length,
    });
    return data;
  };

  if (backoffConfig) {
    return withExponentialBackoff(fetchFn, backoffConfig, logger);
  }
  return fetchFn();
}

export async function fetchInvestigationLogs(
  config: { backendBaseUrl: string },
  investigationId: string,
  logger?: TestLogger
): Promise<InvestigationLogs> {
  const url = `${config.backendBaseUrl}/logs/${investigationId}`;
  logger?.debug('Fetching backend logs', { url });

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`${response.status}`);

    const data = await response.json();
    logger?.debug('Backend logs retrieved', {
      logCount: (data as Record<string, unknown>).logs?.length || 0,
    });
    return data;
  } catch (error) {
    logger?.error('Failed to fetch logs', { error: String(error) });
    throw error;
  }
}

export async function checkHealth(
  config: { backendBaseUrl: string },
  timeoutMs?: number,
  logger?: TestLogger
): Promise<boolean> {
  logger?.debug('Checking server health', { url: config.backendBaseUrl });

  try {
    const response = await fetch(`${config.backendBaseUrl}/health`, {
      signal: AbortSignal.timeout(timeoutMs || 5000),
    });

    const isHealthy = response.ok;
    logger?.[isHealthy ? 'success' : 'warn']('Server health', { status: response.status });
    return isHealthy;
  } catch (error) {
    logger?.error('Server health check failed', { error: String(error) });
    return false;
  }
}
