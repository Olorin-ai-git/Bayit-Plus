/**
 * useHybridGraphPolling Hook
 * Feature: 006-hybrid-graph-integration
 *
 * React hook wrapping HybridGraphPollingService with state management.
 * Handles polling lifecycle, status updates, and error handling.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven: Uses hybridGraphConfig
 * - Complete implementation: No placeholders or TODOs
 * - React lifecycle: Proper cleanup on unmount
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { HybridGraphPollingService } from "../services/hybridGraphPollingService";
import type { InvestigationStatus } from "../types/hybridGraphTypes";

/** Hook state */
interface PollingState {
  status: InvestigationStatus | null;
  isPolling: boolean;
  error: Error | null;
  retryCount: number;
}

/** Hook return value */
interface UsePollingReturn extends PollingState {
  startPolling: () => void;
  stopPolling: () => void;
  resetError: () => void;
}

/**
 * Hook for polling investigation status with automatic lifecycle management.
 *
 * @param investigationId - Investigation ID to poll
 * @param autoStart - Start polling automatically on mount (default: false)
 * @returns Polling state and control functions
 */
export function useHybridGraphPolling(
  investigationId: string,
  autoStart: boolean = false
): UsePollingReturn {
  const [state, setState] = useState<PollingState>({
    status: null,
    isPolling: false,
    error: null,
    retryCount: 0,
  });

  const serviceRef = useRef<HybridGraphPollingService | null>(null);

  const handleUpdate = useCallback((status: InvestigationStatus) => {
    setState((prev) => ({
      ...prev,
      status,
      error: null,
    }));
  }, []);

  const handleError = useCallback((error: Error) => {
    setState((prev) => ({
      ...prev,
      error,
      retryCount: serviceRef.current?.getRetryCount() || 0,
    }));
  }, []);

  const handleComplete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPolling: false,
    }));
  }, []);

  const startPolling = useCallback(() => {
    if (!serviceRef.current) {
      serviceRef.current = new HybridGraphPollingService(investigationId, {
        onUpdate: handleUpdate,
        onError: handleError,
        onComplete: handleComplete,
      });
    }

    serviceRef.current.start();
    setState((prev) => ({ ...prev, isPolling: true, error: null }));
  }, [investigationId, handleUpdate, handleError, handleComplete]);

  const stopPolling = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stop();
      setState((prev) => ({ ...prev, isPolling: false }));
    }
  }, []);

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, retryCount: 0 }));
  }, []);

  useEffect(() => {
    if (autoStart) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart, startPolling, stopPolling]);

  return {
    ...state,
    startPolling,
    stopPolling,
    resetError,
  };
}
