/**
 * SSE with Polling Fallback Hook
 * Task: T059 - Phase 7 User Story 2
 * Feature: 001-investigation-state-management
 *
 * Combines SSE and adaptive polling with seamless fallback.
 * Tries SSE first, falls back to polling on connection failure.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven behavior
 * - No hardcoded values
 * - Proper error handling
 */

import { useState, useCallback, useEffect } from 'react';
import { useWebSocketFallback, SSEEvent } from './useWebSocketFallback';
import { useAdaptivePolling } from './useAdaptivePolling';

export interface UseSSEPollingFallbackParams {
  investigationId: string | undefined;
  runId?: string;
  status: 'pending' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  lifecycleStage?: 'draft' | 'submitted' | 'in_progress' | 'completed' | 'failed';
  pollingCallback: () => void | Promise<void>;
  enabled?: boolean;
}

/**
 * SSE with polling fallback hook
 */
export function useSSEPollingFallback({
  investigationId,
  runId,
  status,
  lifecycleStage,
  pollingCallback,
  enabled = true
}: UseSSEPollingFallbackParams) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isUsingSSE, setIsUsingSSE] = useState<boolean>(false);
  const [isUsingPolling, setIsUsingPolling] = useState<boolean>(false);

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    setEvents(prev => [...prev, event]);
  }, []);

  const {
    isConnected,
    fallbackMode,
    error: sseError,
    startSSE,
    stopSSE
  } = useWebSocketFallback({
    investigationId,
    runId,
    onEvent: handleSSEEvent,
    enabled: enabled && !fallbackMode
  });

  const {
    isPolling,
    isPaused: pollingPaused,
    startPolling,
    stopPolling
  } = useAdaptivePolling({
    investigationId,
    status,
    lifecycleStage,
    callback: pollingCallback,
    enabled: enabled && fallbackMode
  });

  useEffect(() => {
    setIsUsingSSE(isConnected);
    setIsUsingPolling(!isConnected && fallbackMode && isPolling);
  }, [isConnected, fallbackMode, isPolling]);

  useEffect(() => {
    if (!enabled) {
      stopSSE();
      stopPolling();
      return;
    }

    if (!fallbackMode) {
      startSSE();
      stopPolling();
    } else {
      stopSSE();
      startPolling();
    }
  }, [enabled, fallbackMode, startSSE, stopSSE, startPolling, stopPolling]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isUsingSSE,
    isUsingPolling,
    sseError,
    pollingPaused,
    clearEvents
  };
}
