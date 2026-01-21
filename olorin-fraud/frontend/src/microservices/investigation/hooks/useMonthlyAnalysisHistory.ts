/**
 * Monthly Analysis History Hook
 * Feature: monthly-frontend-trigger
 *
 * Fetches paginated history of monthly analysis runs.
 * Supports filtering by status and manual refresh.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven pagination
 * - No hardcoded values
 * - Proper error handling
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { monthlyAnalysisService } from '../services/monthlyAnalysisService';
import {
  MonthlyAnalysisHistoryItem,
  MonthlyAnalysisHistoryResponse,
  MonthlyAnalysisRunStatus,
} from '../types/monthlyAnalysis';
import { env } from '../../../shared/config/env.config';

/** Default page size from config or fallback */
const DEFAULT_PAGE_SIZE = env.features.defaultPageSize || 20;

export interface UseMonthlyAnalysisHistoryOptions {
  /** Initial page size */
  pageSize?: number;
  /** Status filter */
  statusFilter?: MonthlyAnalysisRunStatus;
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
}

export interface UseMonthlyAnalysisHistoryResult {
  /** History items */
  runs: MonthlyAnalysisHistoryItem[];
  /** Total count of runs */
  total: number;
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Whether more items available */
  hasMore: boolean;
  /** Whether loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Fetch specific page */
  fetchPage: (page: number) => Promise<void>;
  /** Fetch next page */
  fetchNextPage: () => Promise<void>;
  /** Fetch previous page */
  fetchPreviousPage: () => Promise<void>;
  /** Refresh current page */
  refresh: () => Promise<void>;
  /** Change status filter */
  setStatusFilter: (status?: MonthlyAnalysisRunStatus) => void;
}

/**
 * Hook for fetching monthly analysis history with pagination
 *
 * @param options - Configuration options
 * @returns History data and pagination controls
 */
export function useMonthlyAnalysisHistory(
  options: UseMonthlyAnalysisHistoryOptions = {}
): UseMonthlyAnalysisHistoryResult {
  const {
    pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
    statusFilter: initialStatusFilter,
    autoFetch = true,
  } = options;

  const [runs, setRuns] = useState<MonthlyAnalysisHistoryItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(initialPageSize);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<MonthlyAnalysisRunStatus | undefined>(
    initialStatusFilter
  );

  const service = useMemo(() => monthlyAnalysisService, []);
  const isMountedRef = useRef<boolean>(true);

  /**
   * Fetch history data for a specific page
   */
  const fetchPage = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const offset = (pageNum - 1) * pageSize;
      const response = await service.getHistory(pageSize, offset, statusFilter);

      if (!isMountedRef.current) return;

      setRuns(response.runs);
      setTotal(response.total);
      setPage(response.page);
      setHasMore(response.hasMore);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;

      const fetchError = err instanceof Error ? err : new Error('Failed to fetch history');
      setError(fetchError);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [pageSize, statusFilter, service]);

  /**
   * Fetch next page
   */
  const fetchNextPage = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchPage(page + 1);
  }, [hasMore, isLoading, page, fetchPage]);

  /**
   * Fetch previous page
   */
  const fetchPreviousPage = useCallback(async () => {
    if (page <= 1 || isLoading) return;
    await fetchPage(page - 1);
  }, [page, isLoading, fetchPage]);

  /**
   * Refresh current page
   */
  const refresh = useCallback(async () => {
    await fetchPage(page);
  }, [page, fetchPage]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (autoFetch) {
      fetchPage(1);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [autoFetch, fetchPage]);

  /**
   * Refetch when filter changes
   */
  useEffect(() => {
    if (autoFetch) {
      fetchPage(1);
    }
  }, [statusFilter, autoFetch, fetchPage]);

  return {
    runs,
    total,
    page,
    pageSize,
    hasMore,
    isLoading,
    error,
    fetchPage,
    fetchNextPage,
    fetchPreviousPage,
    refresh,
    setStatusFilter,
  };
}
