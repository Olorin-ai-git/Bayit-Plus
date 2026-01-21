/**
 * useRealtimeUpdates Hook
 * Manages real-time updates for investigations via polling or WebSocket
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Investigation } from '../types/investigations';
import { investigationsManagementService } from '../services/investigationsManagementService';

interface UseRealtimeUpdatesOptions {
  enabled: boolean;
  pollInterval?: number;
  onUpdate?: (investigations: Investigation[]) => void;
}

interface UseRealtimeUpdatesReturn {
  isConnected: boolean;
  lastUpdate: Date | null;
  error: string | null;
  toggle: () => void;
}

export const useRealtimeUpdates = (
  options: UseRealtimeUpdatesOptions
): UseRealtimeUpdatesReturn => {
  const { enabled, pollInterval = 15000, onUpdate } = options; // Default 15 seconds instead of 5
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const poll = useCallback(async () => {
    if (!enabled) return;

    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      
      const investigations = await investigationsManagementService.list();
      
      setIsConnected(true);
      setError(null);
      setLastUpdate(new Date());
      
      if (onUpdate) {
        onUpdate(investigations);
      }
    } catch (err: any) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      
      // Handle rate limiting (429) - don't mark as disconnected, just log
      if (err?.response?.status === 429) {
        console.warn('[useRealtimeUpdates] Rate limited, will retry on next interval');
        setError('Rate limited - retrying...');
        // Don't set isConnected to false on rate limit
        return;
      }
      
      setIsConnected(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch updates';
      setError(errorMessage);
      console.error('[useRealtimeUpdates] Error polling:', err);
    }
  }, [enabled, onUpdate]);

  useEffect(() => {
    if (enabled) {
      // Don't poll immediately - wait for the first interval to avoid duplicate requests
      // The useInvestigations hook will handle the initial load
      
      // Set up polling interval
      intervalRef.current = setInterval(() => {
        poll();
      }, pollInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    } else {
      setIsConnected(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [enabled, pollInterval, poll]);

  const toggle = useCallback(() => {
    // Toggle is handled by parent component changing 'enabled' prop
  }, []);

  return {
    isConnected,
    lastUpdate,
    error,
    toggle
  };
};

