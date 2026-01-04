/**
 * Unified Data Fetching Hook
 *
 * Consolidates all data fetching logic with consistent error handling,
 * loading states, retry logic, and caching.
 *
 * Replaces: useFetch, useApi, useInvestigationData, useAgentData
 *
 * @module shared/hooks/useQuery
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseQueryOptions<T> {
  /** Enable/disable query execution (default: true) */
  enabled?: boolean;
  /** Retry failed requests (default: 3) */
  retry?: number;
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number;
  /** Refetch interval in ms (0 = disabled) */
  refetchInterval?: number;
  /** Refetch on window focus (default: false) */
  refetchOnFocus?: boolean;
  /** Refetch on reconnect (default: false) */
  refetchOnReconnect?: boolean;
  /** Cache time in ms (default: 300000 = 5 min) */
  cacheTime?: number;
  /** Stale time in ms (default: 0) */
  staleTime?: number;
  /** Initial data */
  initialData?: T;
  /** Called on success */
  onSuccess?: (data: T) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Called when status changes */
  onStatusChange?: (status: QueryStatus) => void;
}

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseQueryReturn<T> {
  /** Query data */
  data: T | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Query status */
  status: QueryStatus;
  /** Whether query has succeeded */
  isSuccess: boolean;
  /** Whether query has failed */
  isError: boolean;
  /** Whether data is stale */
  isStale: boolean;
  /** Refetch the query */
  refetch: () => Promise<void>;
  /** Reset query state */
  reset: () => void;
}

// ============================================================================
// Query Cache
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

const queryCache = new Map<string, CacheEntry<any>>();

function getCacheKey(key: string | string[]): string {
  return Array.isArray(key) ? key.join(':') : key;
}

function getCachedData<T>(
  key: string | string[],
  staleTime: number
): T | undefined {
  const cacheKey = getCacheKey(key);
  const entry = queryCache.get(cacheKey);

  if (!entry) return undefined;

  const isStale = Date.now() - entry.timestamp > staleTime;
  entry.isStale = isStale;

  return entry.data;
}

function setCachedData<T>(key: string | string[], data: T): void {
  const cacheKey = getCacheKey(key);
  queryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    isStale: false
  });
}

function clearCache(key?: string | string[]): void {
  if (key) {
    const cacheKey = getCacheKey(key);
    queryCache.delete(cacheKey);
  } else {
    queryCache.clear();
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Unified data fetching hook with caching, retries, and error handling
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, isLoading, error } = useQuery(
 *   'investigation-123',
 *   () => api.investigations.get('123')
 * );
 *
 * // With options
 * const { data, isLoading, refetch } = useQuery(
 *   ['investigations', 'list'],
 *   () => api.investigations.list(),
 *   {
 *     retry: 3,
 *     refetchInterval: 5000,
 *     onSuccess: (data) => console.log('Success:', data)
 *   }
 * );
 *
 * // Conditional query
 * const { data } = useQuery(
 *   ['investigation', id],
 *   () => api.investigations.get(id),
 *   { enabled: !!id }
 * );
 * ```
 */
export function useQuery<T>(
  key: string | string[],
  fetcher: () => Promise<T>,
  options: UseQueryOptions<T> = {}
): UseQueryReturn<T> {
  const {
    enabled = true,
    retry = 3,
    retryDelay = 1000,
    refetchInterval = 0,
    refetchOnFocus = false,
    refetchOnReconnect = false,
    cacheTime = 300000, // 5 minutes
    staleTime = 0,
    initialData,
    onSuccess,
    onError,
    onStatusChange
  } = options;

  // State
  const [data, setData] = useState<T | undefined>(
    initialData || getCachedData<T>(key, staleTime)
  );
  const [status, setStatus] = useState<QueryStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const retryCount = useRef(0);
  const refetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // ============================================================================
  // Status Management
  // ============================================================================

  const updateStatus = useCallback(
    (newStatus: QueryStatus) => {
      setStatus(newStatus);
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    },
    [onStatusChange]
  );

  // ============================================================================
  // Fetch Function
  // ============================================================================

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    updateStatus('loading');
    setError(null);

    try {
      const result = await fetcher();

      if (!isMountedRef.current) return;

      setData(result);
      setCachedData(key, result);
      updateStatus('success');
      retryCount.current = 0;

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error(String(err));

      // Retry logic
      if (retryCount.current < retry) {
        retryCount.current++;
        setTimeout(() => {
          fetchData();
        }, retryDelay * retryCount.current);
        return;
      }

      setError(error);
      updateStatus('error');

      if (onError) {
        onError(error);
      }
    }
  }, [
    enabled,
    fetcher,
    key,
    retry,
    retryDelay,
    onSuccess,
    onError,
    updateStatus
  ]);

  // ============================================================================
  // Refetch Function
  // ============================================================================

  const refetch = useCallback(async () => {
    retryCount.current = 0;
    await fetchData();
  }, [fetchData]);

  // ============================================================================
  // Reset Function
  // ============================================================================

  const reset = useCallback(() => {
    setData(initialData);
    setStatus('idle');
    setError(null);
    retryCount.current = 0;
    clearCache(key);
  }, [initialData, key]);

  // ============================================================================
  // Initial Fetch
  // ============================================================================

  useEffect(() => {
    if (enabled) {
      // Check for cached data first
      const cached = getCachedData<T>(key, staleTime);
      if (cached && !queryCache.get(getCacheKey(key))?.isStale) {
        setData(cached);
        updateStatus('success');
      } else {
        fetchData();
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [enabled, key, staleTime, fetchData, updateStatus]);

  // ============================================================================
  // Refetch Interval
  // ============================================================================

  useEffect(() => {
    if (refetchInterval > 0 && enabled) {
      refetchIntervalRef.current = setInterval(() => {
        refetch();
      }, refetchInterval);

      return () => {
        if (refetchIntervalRef.current) {
          clearInterval(refetchIntervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, refetch]);

  // ============================================================================
  // Refetch on Focus
  // ============================================================================

  useEffect(() => {
    if (!refetchOnFocus || !enabled) return;

    const handleFocus = () => {
      refetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnFocus, enabled, refetch]);

  // ============================================================================
  // Refetch on Reconnect
  // ============================================================================

  useEffect(() => {
    if (!refetchOnReconnect || !enabled) return;

    const handleOnline = () => {
      refetch();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchOnReconnect, enabled, refetch]);

  // ============================================================================
  // Cache Cleanup
  // ============================================================================

  useEffect(() => {
    if (cacheTime > 0) {
      const timer = setTimeout(() => {
        clearCache(key);
      }, cacheTime);

      return () => clearTimeout(timer);
    }
  }, [key, cacheTime]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const isError = status === 'error';
  const isStale = queryCache.get(getCacheKey(key))?.isStale ?? false;

  // ============================================================================
  // Return
  // ============================================================================

  return {
    data,
    isLoading,
    error,
    status,
    isSuccess,
    isError,
    isStale,
    refetch,
    reset
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear entire query cache
 */
export function clearQueryCache(): void {
  queryCache.clear();
}

/**
 * Invalidate specific query (marks as stale and refetches)
 */
export function invalidateQuery(key: string | string[]): void {
  const cacheKey = getCacheKey(key);
  const entry = queryCache.get(cacheKey);
  if (entry) {
    entry.isStale = true;
  }
}

/**
 * Prefetch query data
 */
export async function prefetchQuery<T>(
  key: string | string[],
  fetcher: () => Promise<T>
): Promise<void> {
  try {
    const data = await fetcher();
    setCachedData(key, data);
  } catch (error) {
    console.error('Prefetch failed:', error);
  }
}

// ============================================================================
// Exports
// ============================================================================

export const queryUtils = {
  clearCache: clearQueryCache,
  invalidate: invalidateQuery,
  prefetch: prefetchQuery
};
