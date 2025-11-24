/**
 * Rate Limit Backoff Hook
 * Task: T068 - Phase 8 User Story 1
 * Feature: 001-investigation-state-management
 *
 * Handles 429 rate limit responses with exponential backoff.
 * Extracts Retry-After header and applies intelligent delay.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven retry behavior
 * - No hardcoded values
 * - Proper error handling
 */

import { useState, useCallback } from 'react';
import { env } from '../../../shared/config/env.config';

export interface RateLimitBackoffConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitterFactor?: number;
}

export interface FetchWithBackoffResult<T> {
  data: T | null;
  isBackingOff: boolean;
  remainingRetries: number;
  error: Error | null;
}

/**
 * Rate limit backoff hook
 */
export function useRateLimitBackoff<T>(
  fetchFn: () => Promise<T>,
  config?: RateLimitBackoffConfig
) {
  const [isBackingOff, setIsBackingOff] = useState<boolean>(false);
  const [remainingRetries, setRemainingRetries] = useState<number>(
    config?.maxRetries ?? env.polling.maxRetries
  );
  const [error, setError] = useState<Error | null>(null);

  const maxRetries = config?.maxRetries ?? env.polling.maxRetries;
  const maxDelay = config?.maxDelay ?? env.polling.maxBackoff;
  const jitterFactor = config?.jitterFactor ?? 0.2;

  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const calculateDelay = (
    retryAfter: number | null,
    attemptNumber: number
  ): number => {
    let delay: number;

    if (retryAfter) {
      delay = retryAfter * 1000;
    } else {
      delay = Math.min(
        env.polling.baseInterval * Math.pow(env.polling.backoffMultiplier, attemptNumber),
        maxDelay
      );
    }

    const jitter = delay * jitterFactor * (Math.random() - 0.5) * 2;
    return Math.min(delay + jitter, maxDelay);
  };

  const extractRetryAfter = (err: any): number | null => {
    if (err.headers && err.headers['retry-after']) {
      const retryAfter = parseInt(err.headers['retry-after'], 10);
      return isNaN(retryAfter) ? null : retryAfter;
    }
    return null;
  };

  const fetchWithBackoff = useCallback(
    async (attemptNumber: number = 0): Promise<FetchWithBackoffResult<T>> => {
      if (attemptNumber >= maxRetries) {
        const maxRetriesError = new Error(
          `Maximum retries (${maxRetries}) exceeded due to rate limiting`
        );
        setError(maxRetriesError);
        setIsBackingOff(false);
        return {
          data: null,
          isBackingOff: false,
          remainingRetries: 0,
          error: maxRetriesError
        };
      }

      try {
        const data = await fetchFn();
        setRemainingRetries(maxRetries);
        setIsBackingOff(false);
        setError(null);

        return {
          data,
          isBackingOff: false,
          remainingRetries: maxRetries,
          error: null
        };
      } catch (err: any) {
        if (err.status === 429) {
          const retryAfter = extractRetryAfter(err);
          const delay = calculateDelay(retryAfter, attemptNumber);

          setIsBackingOff(true);
          setRemainingRetries(maxRetries - attemptNumber - 1);

          await sleep(delay);

          return fetchWithBackoff(attemptNumber + 1);
        }

        const fetchError =
          err instanceof Error ? err : new Error('Fetch failed');
        setError(fetchError);
        setIsBackingOff(false);

        return {
          data: null,
          isBackingOff: false,
          remainingRetries: maxRetries - attemptNumber - 1,
          error: fetchError
        };
      }
    },
    [fetchFn, maxRetries, maxDelay, jitterFactor]
  );

  const reset = useCallback(() => {
    setIsBackingOff(false);
    setRemainingRetries(maxRetries);
    setError(null);
  }, [maxRetries]);

  return {
    fetchWithBackoff,
    isBackingOff,
    remainingRetries,
    error,
    reset
  };
}
