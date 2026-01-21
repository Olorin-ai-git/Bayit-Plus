/**
 * Real-time Updates Hook Module
 * Provides useReportUpdates hook for WebSocket-based real-time report updates
 *
 * @module useReportRealtime
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { reportingService } from '../../services/reportingService';

/**
 * Hook for real-time report updates
 * Provides WebSocket connection for real-time report updates with proper cleanup
 *
 * @param reportId - Report ID to subscribe to updates for
 * @returns Real-time updates state and operations including:
 *  - connected: WebSocket connection status
 *  - lastUpdate: Last received update data
 *  - error: Error message if any
 *  - connect: Establish WebSocket connection
 *  - disconnect: Close WebSocket connection
 */
export const useReportUpdates = (reportId: string) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    try {
      const cleanup = reportingService.subscribeToReportUpdates(
        reportId,
        (data) => {
          setLastUpdate(data);
          setError(null);
        }
      );

      cleanupRef.current = cleanup;
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnected(false);
    }
  }, [reportId]);

  const disconnect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [connect]);

  return {
    connected,
    lastUpdate,
    error,
    connect,
    disconnect
  };
};
