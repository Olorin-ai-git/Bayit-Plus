/**
 * Retry utilities
 *
 * Provides retry logic with exponential backoff for API requests.
 */

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Whether to add jitter to delays */
  jitter?: boolean;
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Callback for each retry attempt */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  isRetryable: defaultIsRetryable,
  onRetry: () => {},
};

/**
 * Default function to determine if an error is retryable
 */
export function defaultIsRetryable(error: unknown): boolean {
  // Network errors are retryable
  if (error instanceof Error && error.message.includes('Network')) {
    return true;
  }

  // Check for specific HTTP status codes
  const status = (error as { status?: number })?.status;
  if (status) {
    // Retry on server errors and rate limiting
    return status >= 500 || status === 429;
  }

  // Check for axios error structure
  const response = (error as { response?: { status?: number } })?.response;
  if (response?.status) {
    return response.status >= 500 || response.status === 429;
  }

  return false;
}

/**
 * Calculate delay with optional jitter
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>
): number {
  const { initialDelay, maxDelay, backoffMultiplier, jitter } = config;

  // Calculate exponential backoff
  let delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);

  // Apply max delay cap
  delay = Math.min(delay, maxDelay);

  // Add jitter (±25% randomization)
  if (jitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5;
    delay = Math.floor(delay * jitterFactor);
  }

  return delay;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps an async function with retry logic
 *
 * @param fn - Async function to wrap
 * @param config - Retry configuration
 * @returns Wrapped function with retry behavior
 *
 * @example
 * ```typescript
 * const fetchWithRetry = withRetry(
 *   () => api.get('/data'),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 *
 * const result = await fetchWithRetry();
 * ```
 */
export function withRetry<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  config: RetryConfig = {}
): (...args: Args) => Promise<T> {
  const resolvedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  return async (...args: Args): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= resolvedConfig.maxRetries + 1; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;

        // Don't retry if we've exceeded max retries
        if (attempt > resolvedConfig.maxRetries) {
          break;
        }

        // Don't retry if error is not retryable
        if (!resolvedConfig.isRetryable(error)) {
          break;
        }

        // Calculate delay and wait
        const delay = calculateDelay(attempt, resolvedConfig);
        resolvedConfig.onRetry(attempt, error, delay);
        await sleep(delay);
      }
    }

    throw lastError;
  };
}

/**
 * Executes a function with retry logic
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns Promise with the result
 *
 * @example
 * ```typescript
 * const data = await retry(
 *   () => api.get('/data'),
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  return withRetry(fn, config)();
}

/**
 * Creates a retry wrapper with preset configuration
 *
 * @param config - Default retry configuration
 * @returns Retry function with preset config
 *
 * @example
 * ```typescript
 * const apiRetry = createRetry({ maxRetries: 5, initialDelay: 500 });
 *
 * const data = await apiRetry(() => api.get('/data'));
 * const otherData = await apiRetry(() => api.get('/other'));
 * ```
 */
export function createRetry(config: RetryConfig = {}) {
  return <T>(fn: () => Promise<T>, overrides: RetryConfig = {}): Promise<T> => {
    return retry(fn, { ...config, ...overrides });
  };
}
