/**
 * Monthly Analysis Status Polling Hook
 * Feature: monthly-frontend-trigger
 *
 * Polls monthly analysis status endpoint with adaptive intervals and ETag caching.
 * Stops polling when analysis reaches terminal status.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven polling intervals
 * - No hardcoded values
 * - Terminal status detection
 * - ETag-based conditional requests
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { monthlyAnalysisService } from '../services/monthlyAnalysisService';
import { MonthlyAnalysisStatus, isTerminalStatus } from '../types/monthlyAnalysis';
import { env } from '../../../shared/config/env.config';
import { useETagCache } from './useETagCache';

/** Polling interval when analysis is running (5 seconds) */
const RUNNING_POLL_INTERVAL_MS = env.features.pollingIntervalMs
  ? Math.min(env.features.pollingIntervalMs, 5000)
  : 5000;

/** Polling interval when idle (30 seconds) */
const IDLE_POLL_INTERVAL_MS = env.features.pollingIntervalMs || 30000;

/** Maximum retries before giving up */
const MAX_RETRIES = 5;

export interface UseMonthlyAnalysisStatusOptions {
  /** Run ID to poll (if specific run) */
  runId?: string;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Custom poll interval (ms) */
  pollInterval?: number;
}

export interface UseMonthlyAnalysisStatusResult {
  /** Current status data */
  status: MonthlyAnalysisStatus | null;
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether polling is active */
  isPolling: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Number of consecutive errors */
  retryCount: number;
  /** Manually refresh status */
  refetch: () => Promise<void>;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
}

/**
 * Hook for polling monthly analysis status
 *
 * @param options - Configuration options
 * @returns Status data and polling controls
 */
export function useMonthlyAnalysisStatus(
  options: UseMonthlyAnalysisStatusOptions = {}
): UseMonthlyAnalysisStatusResult {
  const { runId, enabled = true, pollInterval: customInterval } = options;

  const [status, setStatus] = useState<MonthlyAnalysisStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const service = useMemo(() => monthlyAnalysisService, []);

  const isMountedRef = useRef<boolean>(true);
  const statusRef = useRef<MonthlyAnalysisStatus | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCallInProgressRef = useRef<boolean>(false);

  // Update ref when status changes
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ETag cache for conditional requests
  const cacheKey = runId || 'current';
  const { getETag, saveETag, clearETag } = useETagCache(cacheKey);

  /**
   * Calculate poll interval based on status
   */
  const getPollInterval = useCallback((): number => {
    if (customInterval) return customInterval;

    const currentStatus = statusRef.current?.status;
    if (currentStatus === 'running') {
      return RUNNING_POLL_INTERVAL_MS;
    }
    return IDLE_POLL_INTERVAL_MS;
  }, [customInterval]);

  /**
   * Fetch status from API
   */
  const fetchStatus = useCallback(async (forceFetch: boolean = false) => {
    if (isCallInProgressRef.current && !forceFetch) {
      return;
    }

    isCallInProgressRef.current = true;

    try {
      const hasRelevantData = statusRef.current &&
        (runId ? statusRef.current.runId === runId : true);
      const cachedETag = (hasRelevantData && !forceFetch) ? getETag() : null;

      let result;
      if (runId) {
        result = await service.getRunStatus(runId, cachedETag);
      } else {
        // For current status, we don't have ETag support on the simple endpoint
        const currentStatus = await service.getCurrentStatus();
        result = { data: currentStatus, etag: null };
      }

      if (!isMountedRef.current) return;

      // Handle 304 Not Modified
      if (result.data === null) {
        if (result.etag) saveETag(result.etag);
        return;
      }

      // Save ETag
      if (result.etag) {
        saveETag(result.etag);
      }

      setStatus(result.data);
      setError(null);
      setRetryCount(0);
      setIsLoading(false);

      // Stop polling if terminal status
      if (result.data && isTerminalStatus(result.data.status)) {
        clearETag();
      }

    } catch (err) {
      if (!isMountedRef.current) return;

      const fetchError = err instanceof Error ? err : new Error('Failed to fetch status');
      setError(fetchError);
      setIsLoading(false);
      setRetryCount(prev => Math.min(prev + 1, MAX_RETRIES));
    } finally {
      isCallInProgressRef.current = false;
    }
  }, [runId, service, getETag, saveETag, clearETag]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    setIsPolling(true);

    const poll = () => {
      fetchStatus();
      const interval = getPollInterval();
      pollIntervalRef.current = setTimeout(poll, interval);
    };

    // Initial fetch then start interval
    fetchStatus();
    const interval = getPollInterval();
    pollIntervalRef.current = setTimeout(poll, interval);
  }, [fetchStatus, getPollInterval]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /**
   * Initialize and manage polling lifecycle
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      startPolling();
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [enabled, runId, startPolling, stopPolling]);

  /**
   * Auto-stop polling on terminal status
   */
  useEffect(() => {
    if (status && isTerminalStatus(status.status)) {
      stopPolling();
    }
  }, [status, stopPolling]);

  /**
   * Restart polling when status changes from terminal to non-terminal
   */
  useEffect(() => {
    if (status && !isTerminalStatus(status.status) && enabled && !isPolling) {
      startPolling();
    }
  }, [status, enabled, isPolling, startPolling]);

  return {
    status,
    isLoading,
    isPolling,
    error,
    retryCount,
    refetch: () => fetchStatus(true),
    startPolling,
    stopPolling,
  };
}
