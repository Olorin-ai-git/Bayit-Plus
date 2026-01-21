/**
 * Optimistic Concurrency Control Hook
 * Task: T049 - Phase 6 User Story 1
 * Feature: 001-investigation-state-management
 *
 * Implements optimistic locking using ETag/version for concurrent updates.
 * Handles 409 Conflict responses with automatic refetch and retry.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven retry behavior
 * - No hardcoded values
 * - Proper error handling
 */

import { useState, useCallback } from 'react';
import { env } from '../../../shared/config/env.config';

export type UpdateFunction<T, U> = (
  id: string,
  updates: U,
  version?: string
) => Promise<T>;

export interface OptimisticUpdateResult<T> {
  data: T | null;
  isConflict: boolean;
  isLoading: boolean;
  error: Error | null;
}

export interface UseOptimisticUpdateParams<T, U> {
  updateFn: UpdateFunction<T, U>;
  refetchFn: (id: string) => Promise<T>;
  onConflict?: (currentData: T) => void;
  maxRetries?: number;
}

/**
 * Optimistic concurrency control hook
 */
export function useOptimisticUpdate<T, U>({
  updateFn,
  refetchFn,
  onConflict,
  maxRetries
}: UseOptimisticUpdateParams<T, U>) {
  const [data, setData] = useState<T | null>(null);
  const [isConflict, setIsConflict] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const maxRetriesConfig = maxRetries ?? env.polling.maxRetries;

  const executeUpdate = useCallback(
    async (
      id: string,
      updates: U,
      version?: string
    ): Promise<OptimisticUpdateResult<T>> => {
      setIsLoading(true);
      setError(null);
      setIsConflict(false);

      try {
        const result = await updateFn(id, updates, version);
        setData(result);
        setRetryCount(0);
        setIsLoading(false);

        return {
          data: result,
          isConflict: false,
          isLoading: false,
          error: null
        };
      } catch (err: any) {
        if (err.status === 409) {
          setIsConflict(true);

          try {
            const currentData = await refetchFn(id);
            setData(currentData);

            if (onConflict) {
              onConflict(currentData);
            }

            setIsLoading(false);
            const conflictError = new Error(
              'Version conflict detected. Please review and retry.'
            );

            return {
              data: currentData,
              isConflict: true,
              isLoading: false,
              error: conflictError
            };
          } catch (refetchErr) {
            const refetchError =
              refetchErr instanceof Error
                ? refetchErr
                : new Error('Failed to refetch after conflict');
            setError(refetchError);
            setIsLoading(false);

            return {
              data: null,
              isConflict: true,
              isLoading: false,
              error: refetchError
            };
          }
        }

        const updateError =
          err instanceof Error ? err : new Error('Update failed');
        setError(updateError);
        setIsLoading(false);

        return {
          data: null,
          isConflict: false,
          isLoading: false,
          error: updateError
        };
      }
    },
    [updateFn, refetchFn, onConflict]
  );

  const retryUpdate = useCallback(
    async (
      id: string,
      updates: U,
      newVersion?: string
    ): Promise<OptimisticUpdateResult<T>> => {
      if (retryCount >= maxRetriesConfig) {
        const maxRetriesError = new Error(
          `Maximum retries (${maxRetriesConfig}) exceeded`
        );
        setError(maxRetriesError);
        return {
          data: null,
          isConflict: false,
          isLoading: false,
          error: maxRetriesError
        };
      }

      setRetryCount(prev => prev + 1);
      return executeUpdate(id, updates, newVersion);
    },
    [executeUpdate, retryCount, maxRetriesConfig]
  );

  const reset = useCallback(() => {
    setData(null);
    setIsConflict(false);
    setIsLoading(false);
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    data,
    isConflict,
    isLoading,
    error,
    retryCount,
    executeUpdate,
    retryUpdate,
    reset
  };
}
