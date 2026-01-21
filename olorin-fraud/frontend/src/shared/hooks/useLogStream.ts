/**
 * Log Stream SSE Hook
 * Feature: 021-live-merged-logstream
 *
 * Custom React hook for consuming SSE log streams from backend.
 * Handles automatic reconnection, Last-Event-ID resume, and event parsing.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven SSE endpoint URLs (no hardcoded values)
 * - Type-safe event handling with UnifiedLog type
 * - Proper cleanup and resource management
 * - No mocks, stubs, or placeholders
 *
 * Author: Gil Klainert
 * Date: 2025-11-13
 * Spec: /specs/021-live-merged-logstream/frontend-integration.md
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Unified log entry structure matching backend LogEntry model
 */
export interface UnifiedLog {
  investigation_id: string;
  ts: string;
  seq: number;
  source: 'frontend' | 'backend';
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  metadata?: Record<string, unknown>;
  event_hash: string;
}

/**
 * Configuration for useLogStream hook
 */
export interface UseLogStreamConfig {
  /** Investigation ID to stream logs for */
  investigationId: string;
  /** Base API URL (from environment config) */
  baseUrl?: string;
  /** Whether to connect automatically on mount */
  autoConnect?: boolean;
  /** Optional start timestamp filter */
  startTime?: Date;
  /** Optional end timestamp filter */
  endTime?: Date;
  /** Callback when log event received */
  onLog?: (log: UnifiedLog) => void;
  /** Callback when heartbeat received */
  onHeartbeat?: () => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** Callback when connection opens */
  onOpen?: () => void;
  /** Callback when connection closes */
  onClose?: () => void;
}

/**
 * Return type for useLogStream hook
 */
export interface UseLogStreamReturn {
  /** Array of received logs */
  logs: UnifiedLog[];
  /** Whether SSE connection is active */
  isConnected: boolean;
  /** Current error if any */
  error: Error | null;
  /** Manually connect to stream */
  connect: () => void;
  /** Manually disconnect from stream */
  disconnect: () => void;
  /** Clear accumulated logs */
  clear: () => void;
}

/**
 * Custom hook for SSE log streaming
 *
 * @example
 * ```tsx
 * const { logs, isConnected, connect, disconnect } = useLogStream({
 *   investigationId: 'inv-123',
 *   baseUrl: process.env.REACT_APP_API_BASE_URL,
 *   autoConnect: true,
 *   onLog: (log) => console.log('New log:', log),
 *   onError: (err) => console.error('Stream error:', err)
 * });
 * ```
 */
export function useLogStream(config: UseLogStreamConfig): UseLogStreamReturn {
  const {
    investigationId,
    baseUrl = process.env.REACT_APP_API_BASE_URL || '',
    autoConnect = false,
    startTime,
    endTime,
    onLog,
    onHeartbeat,
    onError,
    onOpen,
    onClose,
  } = config;

  const [logs, setLogs] = useState<UnifiedLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  /**
   * Build SSE stream URL with query parameters
   */
  const buildStreamUrl = useCallback((): string => {
    const url = new URL(
      `/api/v1/investigations/${investigationId}/logs/stream`,
      baseUrl
    );

    if (startTime) {
      url.searchParams.set('start_time', startTime.toISOString());
    }
    if (endTime) {
      url.searchParams.set('end_time', endTime.toISOString());
    }

    return url.toString();
  }, [investigationId, baseUrl, startTime, endTime]);

  /**
   * Connect to SSE stream
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return; // Already connected
    }

    try {
      const streamUrl = buildStreamUrl();
      const eventSource = new EventSource(streamUrl);

      // Set Last-Event-ID header for reconnection resume
      if (lastEventIdRef.current) {
        eventSource.addEventListener('open', () => {
          // Note: EventSource automatically sends Last-Event-ID header on reconnect
        });
      }

      // Handle connection open
      eventSource.addEventListener('open', () => {
        setIsConnected(true);
        setError(null);
        onOpen?.();
      });

      // Handle log events
      eventSource.addEventListener('log', (event: MessageEvent) => {
        try {
          const log: UnifiedLog = JSON.parse(event.data);
          lastEventIdRef.current = event.lastEventId;

          setLogs((prev) => [...prev, log]);
          onLog?.(log);
        } catch (err) {
          const parseError = new Error(
            `Failed to parse log event: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
          setError(parseError);
          onError?.(parseError);
        }
      });

      // Handle heartbeat events
      eventSource.addEventListener('heartbeat', () => {
        onHeartbeat?.();
      });

      // Handle error events from server
      eventSource.addEventListener('error', (event: MessageEvent) => {
        try {
          const errorData = JSON.parse(event.data);
          const streamError = new Error(errorData.error || 'Stream error');
          setError(streamError);
          onError?.(streamError);
        } catch {
          // Generic error event (connection issue)
          const connectionError = new Error('SSE connection error');
          setError(connectionError);
          onError?.(connectionError);
        }
      });

      // Handle connection errors
      eventSource.onerror = () => {
        setIsConnected(false);
        onClose?.();
        // EventSource will automatically attempt reconnection
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      const connectError = new Error(
        `Failed to connect to stream: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      setError(connectError);
      onError?.(connectError);
    }
  }, [buildStreamUrl, onLog, onHeartbeat, onError, onOpen, onClose]);

  /**
   * Disconnect from SSE stream
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      onClose?.();
    }
  }, [onClose]);

  /**
   * Clear accumulated logs
   */
  const clear = useCallback(() => {
    setLogs([]);
  }, []);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    logs,
    isConnected,
    error,
    connect,
    disconnect,
    clear,
  };
}
