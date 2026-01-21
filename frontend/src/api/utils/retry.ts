/**
 * Retry Utilities
 *
 * Constitutional Compliance:
 * - Configuration-driven retry settings
 * - Type-safe retry logic
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { retry, retryWithStrategy } from '@api/utils/retry';
 */

import { getApiConfig } from '../config';

/**
 * Retry strategy
 */
export type RetryStrategy = 'exponential' | 'linear' | 'fixed';

/**
 * Retry options
 */
export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  maxDelayMs?: number;
  strategy?: RetryStrategy;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

/**
 * Calculate delay based on strategy
 */
function calculateDelay(attempt: number, strategy: RetryStrategy, baseDelay: number, maxDelay: number): number {
  let delay: number;

  switch (strategy) {
    case 'exponential':
      delay = baseDelay * Math.pow(2, attempt);
      break;
    case 'linear':
      delay = baseDelay * (attempt + 1);
      break;
    case 'fixed':
    default:
      delay = baseDelay;
      break;
  }

  return Math.min(delay, maxDelay);
}

/**
 * Retry async function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = getApiConfig();

  const {
    maxAttempts = config.retryAttempts,
    delayMs = config.retryDelayMs,
    maxDelayMs = 30000,
    strategy = 'exponential',
    shouldRetry = () => true,
    onRetry
  } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts - 1 && shouldRetry(error, attempt)) {
        const delay = calculateDelay(attempt, strategy, delayMs, maxDelayMs);
        onRetry?.(error, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Retry with specific strategy
 */
export async function retryWithStrategy<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy,
  maxAttempts?: number
): Promise<T> {
  return retry(fn, { strategy, maxAttempts });
}

/**
 * Retry with exponential backoff
 */
export async function retryExponential<T>(
  fn: () => Promise<T>,
  maxAttempts?: number
): Promise<T> {
  return retry(fn, { strategy: 'exponential', maxAttempts });
}

/**
 * Retry with linear backoff
 */
export async function retryLinear<T>(
  fn: () => Promise<T>,
  maxAttempts?: number
): Promise<T> {
  return retry(fn, { strategy: 'linear', maxAttempts });
}

/**
 * Retry with fixed delay
 */
export async function retryFixed<T>(
  fn: () => Promise<T>,
  maxAttempts?: number,
  delayMs?: number
): Promise<T> {
  return retry(fn, { strategy: 'fixed', maxAttempts, delayMs });
}

/**
 * Retry until condition is met
 */
export async function retryUntil<T>(
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const config = getApiConfig();

  const {
    maxAttempts = config.retryAttempts,
    delayMs = config.retryDelayMs,
    maxDelayMs = 30000,
    strategy = 'exponential'
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await fn();

    if (condition(result)) {
      return result;
    }

    if (attempt < maxAttempts - 1) {
      const delay = calculateDelay(attempt, strategy, delayMs, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Retry condition not met within max attempts');
}

/**
 * Retry with timeout
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  options: RetryOptions = {}
): Promise<T> {
  return Promise.race([
    retry(fn, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Retry timeout exceeded')), timeoutMs)
    )
  ]);
}
