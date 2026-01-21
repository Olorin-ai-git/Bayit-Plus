/**
 * Real-time React Hooks
 *
 * Constitutional Compliance:
 * - Type-safe real-time subscriptions
 * - Automatic cleanup
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { useRealtimeInvestigation } from '@api/realtime/hooks';
 */

import { useState, useEffect, useCallback } from 'react';
import { getRealtimeConnection, type RealtimeEvents } from './connection';
import type { InvestigationResponse } from '../schemas/investigation';

/**
 * Real-time connection hook
 */
export function useRealtimeConnection() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const connection = getRealtimeConnection();

    const unsubscribeEstablished = connection.on('connection:established', () => {
      setConnected(true);
      setError(null);
    });

    const unsubscribeLost = connection.on('connection:lost', () => {
      setConnected(false);
    });

    const unsubscribeError = connection.on('connection:error', (err) => {
      setError(err);
    });

    connection.connect();

    return () => {
      unsubscribeEstablished();
      unsubscribeLost();
      unsubscribeError();
    };
  }, []);

  return { connected, error };
}

/**
 * Investigation real-time updates hook
 */
export interface UseRealtimeInvestigationOptions {
  onCreated?: (data: InvestigationResponse) => void;
  onUpdated?: (data: InvestigationResponse) => void;
  onCompleted?: (data: InvestigationResponse) => void;
  onFailed?: (data: { investigation_id: string; error: string }) => void;
}

export function useRealtimeInvestigation(
  investigationId: string | null,
  options: UseRealtimeInvestigationOptions = {}
) {
  const [investigation, setInvestigation] = useState<InvestigationResponse | null>(null);
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    if (!investigationId) {
      return;
    }

    const connection = getRealtimeConnection();
    connection.subscribeToInvestigation(investigationId);

    const unsubscribeCreated = connection.on('investigation:created', (data) => {
      if (data.investigation_id === investigationId) {
        setInvestigation(data);
        setStatus(data.status);
        options.onCreated?.(data);
      }
    });

    const unsubscribeUpdated = connection.on('investigation:updated', (data) => {
      if (data.investigation_id === investigationId) {
        setInvestigation(data);
        setStatus(data.status);
        options.onUpdated?.(data);
      }
    });

    const unsubscribeCompleted = connection.on('investigation:completed', (data) => {
      if (data.investigation_id === investigationId) {
        setInvestigation(data);
        setStatus('completed');
        options.onCompleted?.(data);
      }
    });

    const unsubscribeFailed = connection.on('investigation:failed', (data) => {
      if (data.investigation_id === investigationId) {
        setStatus('failed');
        options.onFailed?.(data);
      }
    });

    return () => {
      connection.unsubscribeFromInvestigation(investigationId);
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeCompleted();
      unsubscribeFailed();
    };
  }, [investigationId, options]);

  return { investigation, status };
}

/**
 * Investigation progress hook
 */
export interface ProgressUpdate {
  progress: number;
  phase: string;
  timestamp: string;
}

export function useInvestigationProgress(investigationId: string | null) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);

  useEffect(() => {
    if (!investigationId) {
      return;
    }

    const connection = getRealtimeConnection();

    const unsubscribe = connection.on('progress:update', (data) => {
      if (data.investigation_id === investigationId) {
        setProgress({
          progress: data.progress,
          phase: data.phase,
          timestamp: new Date().toISOString()
        });
      }
    });

    return unsubscribe;
  }, [investigationId]);

  return progress;
}

/**
 * Investigation logs hook
 */
export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

export function useInvestigationLogs(investigationId: string | null, maxLogs: number = 100) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    if (!investigationId) {
      return;
    }

    const connection = getRealtimeConnection();

    const unsubscribe = connection.on('log:entry', (data) => {
      if (data.investigation_id === investigationId) {
        setLogs((prev) => {
          const newLogs = [
            ...prev,
            {
              level: data.level,
              message: data.message,
              timestamp: data.timestamp
            }
          ];
          return newLogs.slice(-maxLogs);
        });
      }
    });

    return unsubscribe;
  }, [investigationId, maxLogs]);

  return { logs, clearLogs };
}

/**
 * Tool execution tracking hook
 */
export interface ToolExecution {
  tool_name: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  result?: unknown;
}

export function useToolExecutions(investigationId: string | null) {
  const [executions, setExecutions] = useState<Map<string, ToolExecution>>(new Map());

  useEffect(() => {
    if (!investigationId) {
      return;
    }

    const connection = getRealtimeConnection();

    const unsubscribeStarted = connection.on('tool:started', (data) => {
      if (data.investigation_id === investigationId) {
        setExecutions((prev) => {
          const next = new Map(prev);
          next.set(data.tool_name, {
            tool_name: data.tool_name,
            status: 'running',
            started_at: data.timestamp
          });
          return next;
        });
      }
    });

    const unsubscribeCompleted = connection.on('tool:completed', (data) => {
      if (data.investigation_id === investigationId) {
        setExecutions((prev) => {
          const next = new Map(prev);
          const existing = next.get(data.tool_name);
          if (existing) {
            next.set(data.tool_name, {
              ...existing,
              status: 'completed',
              completed_at: data.timestamp,
              result: data.result
            });
          }
          return next;
        });
      }
    });

    return () => {
      unsubscribeStarted();
      unsubscribeCompleted();
    };
  }, [investigationId]);

  return Array.from(executions.values());
}

/**
 * Generic real-time event hook
 */
export function useRealtimeEvent<K extends keyof RealtimeEvents>(
  event: K,
  handler: (data: RealtimeEvents[K]) => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const connection = getRealtimeConnection();
    const unsubscribe = connection.on(event, handler);
    return unsubscribe;
  }, [event, ...deps]);
}
