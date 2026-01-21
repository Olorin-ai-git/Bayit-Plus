/**
 * Retry Utilities
 * Feature: 021-live-merged-logstream
 *
 * Generic retry logic with exponential backoff.
 * Extracted for reuse across services.
 *
 * Author: Gil Klainert
 * Date: 2025-11-12
 */

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is a client error (4xx status code)
 */
export function isClientError(error: any): boolean {
  return error?.statusCode && error.statusCode >= 400 && error.statusCode < 500;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param retryDelayMs - Initial delay between retries (default: 1000ms)
 * @param shouldRetry - Optional function to determine if error should be retried
 * @returns Result from successful function execution
 * @throws Error from final failed attempt
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelayMs: number = 1000,
  shouldRetry?: (error: any) => boolean
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If shouldRetry function provided, check if we should retry
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      // Don't retry client errors by default
      if (!shouldRetry && isClientError(error)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt < maxRetries) {
        await delay(retryDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}
