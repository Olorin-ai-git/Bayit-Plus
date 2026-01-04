/**
 * WebSocket with Polling Fallback Hook
 * Task: T058 - Phase 7 User Story 1
 * Feature: 001-investigation-state-management
 *
 * SSE real-time updates with automatic fallback to polling on error.
 * Handles EventSource connection with seamless degradation.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven URLs and intervals
 * - No hardcoded values
 * - Proper error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { env } from '../../../shared/config/env.config';

export interface SSEEvent {
  id: string;
  type: 'tool_complete' | 'tool_error' | 'phase_change' | 'log_entry';
  data: any;
  timestamp: string;
}

export interface UseWebSocketFallbackParams {
  investigationId: string | undefined;
  runId?: string;
  onEvent: (event: SSEEvent) => void;
  enabled?: boolean;
}

/**
 * WebSocket with polling fallback hook
 */
export function useWebSocketFallback({
  investigationId,
  runId,
  onEvent,
  enabled = true
}: UseWebSocketFallbackParams) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const startSSE = useCallback(() => {
    if (!investigationId || !enabled || fallbackMode) {
      return;
    }

    stopSSE();

    try {
      const baseUrl = env.api.baseUrl;
      const sseUrl = runId
        ? `${baseUrl}/api/investigations/${investigationId}/runs/${runId}/events`
        : `${baseUrl}/api/investigations/${investigationId}/events`;

      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const parsed: SSEEvent = JSON.parse(event.data);
          onEvent(parsed);
        } catch (parseErr) {
          console.error('Failed to parse SSE event:', parseErr);
        }
      };

      eventSource.addEventListener('tool_complete', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent({
            id: parsed.id || Date.now().toString(),
            type: 'tool_complete',
            data: parsed,
            timestamp: parsed.timestamp || new Date().toISOString()
          });
        } catch (parseErr) {
          console.error('Failed to parse tool_complete event:', parseErr);
        }
      });

      eventSource.addEventListener('tool_error', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent({
            id: parsed.id || Date.now().toString(),
            type: 'tool_error',
            data: parsed,
            timestamp: parsed.timestamp || new Date().toISOString()
          });
        } catch (parseErr) {
          console.error('Failed to parse tool_error event:', parseErr);
        }
      });

      eventSource.addEventListener('phase_change', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent({
            id: parsed.id || Date.now().toString(),
            type: 'phase_change',
            data: parsed,
            timestamp: parsed.timestamp || new Date().toISOString()
          });
        } catch (parseErr) {
          console.error('Failed to parse phase_change event:', parseErr);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        setFallbackMode(true);
        const sseError = new Error('SSE connection failed. Falling back to polling.');
        setError(sseError);
        stopSSE();
      };
    } catch (err) {
      const connectionError =
        err instanceof Error ? err : new Error('Failed to establish SSE connection');
      setError(connectionError);
      setFallbackMode(true);
      stopSSE();
    }
  }, [investigationId, runId, enabled, fallbackMode, onEvent, stopSSE]);

  useEffect(() => {
    if (investigationId && enabled && !fallbackMode) {
      startSSE();
    }

    return () => {
      stopSSE();
    };
  }, [investigationId, enabled, fallbackMode, startSSE, stopSSE]);

  return {
    isConnected,
    fallbackMode,
    error,
    startSSE,
    stopSSE
  };
}
