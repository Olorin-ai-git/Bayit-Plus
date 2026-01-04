/**
 * Demo Polling Hook
 *
 * Provides adaptive polling for demo investigation progress
 * with automatic interval adjustment based on status.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_POLLING_INTERVALS, DemoStatus } from '../config/demo.config';
import { DemoStatusResponse, getDemoApiService } from '../services/demoApiService';

export interface UseDemoPollingOptions {
  onComplete?: (status: DemoStatusResponse) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export interface UseDemoPollingResult {
  status: DemoStatusResponse | null;
  isPolling: boolean;
  error: Error | null;
  startPolling: (investigationId: string) => void;
  stopPolling: () => void;
  refetch: () => Promise<void>;
}

export const useDemoPolling = (options: UseDemoPollingOptions = {}): UseDemoPollingResult => {
  const { onComplete, onError, enabled = true } = options;

  const [status, setStatus] = useState<DemoStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const investigationIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const clearPollingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!investigationIdRef.current || !mountedRef.current) return;

    try {
      const api = getDemoApiService();
      const newStatus = await api.getInvestigationStatus(investigationIdRef.current);

      if (!mountedRef.current) return;

      setStatus(newStatus);
      setError(null);

      // Handle completion
      if (newStatus.status === 'completed') {
        clearPollingInterval();
        setIsPolling(false);
        onComplete?.(newStatus);
      }

      // Handle error
      if (newStatus.status === 'error') {
        clearPollingInterval();
        setIsPolling(false);
        const err = new Error(newStatus.error || 'Investigation failed');
        setError(err);
        onError?.(err);
      }

      // Adjust polling interval based on status
      const currentInterval = DEMO_POLLING_INTERVALS[newStatus.status as DemoStatus];
      if (currentInterval === 0 && intervalRef.current) {
        clearPollingInterval();
        setIsPolling(false);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    }
  }, [clearPollingInterval, onComplete, onError]);

  const startPolling = useCallback(
    (investigationId: string) => {
      if (!enabled) return;

      investigationIdRef.current = investigationId;
      setIsPolling(true);
      setError(null);

      // Initial fetch
      fetchStatus();

      // Start polling with running interval
      clearPollingInterval();
      intervalRef.current = setInterval(fetchStatus, DEMO_POLLING_INTERVALS.running);
    },
    [enabled, fetchStatus, clearPollingInterval]
  );

  const stopPolling = useCallback(() => {
    clearPollingInterval();
    investigationIdRef.current = null;
    setIsPolling(false);
  }, [clearPollingInterval]);

  const refetch = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearPollingInterval();
    };
  }, [clearPollingInterval]);

  return {
    status,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refetch,
  };
};

export default useDemoPolling;
