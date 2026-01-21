/**
 * React Hooks for Type-Safe API Calls
 *
 * Constitutional Compliance:
 * - Type-safe API interactions in React components
 * - Automatic loading/error state management
 * - No mocks or hardcoded data
 * - Configuration-driven requests
 *
 * Usage:
 *   const { data, loading, error, execute } = useApi<InvestigationResponse>();
 */

import { useState, useCallback, useEffect } from 'react';
import { getApiClient } from '../client';
import type { ApiResult, ApiRequestState } from '../types';
import { isApiSuccess } from '../types';
import { createErrorFromApiError, type ApiErrorBase } from '../errors';

/**
 * Hook options for API requests
 */
export interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiErrorBase) => void;
  executeOnMount?: boolean;
  refetchInterval?: number;
}

/**
 * Return type for useApi hook
 */
export interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: ApiErrorBase | null;
  execute: () => Promise<void>;
  reset: () => void;
}

/**
 * Generic hook for API requests
 *
 * Provides automatic state management for loading, data, and errors
 */
export function useApi<T>(
  apiCall: () => Promise<ApiResult<T>>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const [state, setState] = useState<ApiRequestState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await apiCall();

      if (isApiSuccess(result)) {
        setState({ data: result.data, loading: false, error: null });
        options.onSuccess?.(result.data);
      } else {
        const error = createErrorFromApiError(result.error);
        setState({ data: null, loading: false, error });
        options.onError?.(error);
      }
    } catch (error) {
      const apiError = createErrorFromApiError({
        error: 'unknown_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        status_code: 0,
        timestamp: new Date().toISOString()
      });
      setState({ data: null, loading: false, error: apiError });
      options.onError?.(apiError);
    }
  }, [apiCall, options]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (options.executeOnMount) {
      execute();
    }
  }, []);

  useEffect(() => {
    if (options.refetchInterval && options.refetchInterval > 0) {
      const interval = setInterval(execute, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [execute, options.refetchInterval]);

  return { ...state, execute, reset };
}

/**
 * Hook for GET requests
 */
export function useGet<T>(
  url: string,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const client = getApiClient();
  const apiCall = useCallback(() => client.get<T>(url), [url]);
  return useApi<T>(apiCall, options);
}

/**
 * Hook for POST requests
 */
export function usePost<TRequest, TResponse>(
  url: string,
  options: UseApiOptions<TResponse> = {}
): UseApiReturn<TResponse> & { execute: (data: TRequest) => Promise<void> } {
  const client = getApiClient();
  const [requestData, setRequestData] = useState<TRequest | null>(null);

  const apiCall = useCallback(() => {
    if (requestData === null) {
      throw new Error('No request data provided');
    }
    return client.post<TResponse>(url, requestData);
  }, [url, requestData]);

  const hook = useApi<TResponse>(apiCall, options);

  const execute = useCallback(
    async (data: TRequest) => {
      setRequestData(data);
      await hook.execute();
    },
    [hook]
  );

  return { ...hook, execute };
}

/**
 * Hook for PUT requests
 */
export function usePut<TRequest, TResponse>(
  url: string,
  options: UseApiOptions<TResponse> = {}
): UseApiReturn<TResponse> & { execute: (data: TRequest) => Promise<void> } {
  const client = getApiClient();
  const [requestData, setRequestData] = useState<TRequest | null>(null);

  const apiCall = useCallback(() => {
    if (requestData === null) {
      throw new Error('No request data provided');
    }
    return client.put<TResponse>(url, requestData);
  }, [url, requestData]);

  const hook = useApi<TResponse>(apiCall, options);

  const execute = useCallback(
    async (data: TRequest) => {
      setRequestData(data);
      await hook.execute();
    },
    [hook]
  );

  return { ...hook, execute };
}

/**
 * Hook for DELETE requests
 */
export function useDelete<T>(
  url: string,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const client = getApiClient();
  const apiCall = useCallback(() => client.delete<T>(url), [url]);
  return useApi<T>(apiCall, options);
}
