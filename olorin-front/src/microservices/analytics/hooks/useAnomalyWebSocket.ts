/**
 * useAnomalyWebSocket Hook - WebSocket connection for real-time anomaly updates
 * Includes auto-reconnect and throttling for performance
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { AnomalyApiService } from '../services/anomalyApi';
import type { AnomalyEvent, AnomalyFilter } from '../types/anomaly';

export interface UseAnomalyWebSocketOptions {
  filters?: AnomalyFilter;
  enabled?: boolean;
  throttleMs?: number;
  onReconnect?: () => void;
}

export function useAnomalyWebSocket(
  onAnomaly: (anomaly: AnomalyEvent) => void,
  options: UseAnomalyWebSocketOptions = {}
) {
  const {
    filters,
    enabled = true,
    throttleMs = 2000,
    onReconnect,
  } = options;

  const apiServiceRef = useRef(new AnomalyApiService());
  const closeRef = useRef<(() => void) | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const lastUpdateRef = useRef<number>(0);
  const pendingAnomaliesRef = useRef<AnomalyEvent[]>([]);
  const filtersRef = useRef<AnomalyFilter | undefined>(filters);
  const onAnomalyRef = useRef(onAnomaly);
  const enabledRef = useRef(enabled);
  const throttleMsRef = useRef(throttleMs);
  const previousFiltersStringRef = useRef<string>('');
  const failureCountRef = useRef<number>(0);
  const isDisabledRef = useRef<boolean>(false);
  const maxFailures = 3;
  const lastConnectionAttemptRef = useRef<number>(0);
  const connectionAttemptCountRef = useRef<number>(0);
  const minTimeBetweenConnections = 1000; // 1 second minimum between connections
  const maxConnectionsPerMinute = 5;

  // Memoize filters to prevent unnecessary reconnections
  // Use a deep comparison of filter values, not object reference
  const filtersString = useMemo(() => {
    if (!filters) return '';
    // Sort keys for consistent stringification
    const sorted = Object.keys(filters).sort().reduce((acc, key) => {
      const value = filters[key as keyof AnomalyFilter];
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    return JSON.stringify(sorted);
  }, [
    filters?.severity,
    filters?.metric,
    filters?.detector_id,
    filters?.status,
    filters?.window_start,
    filters?.window_end,
    filters?.min_score,
    filters?.max_score,
    filters?.limit,
    filters?.offset,
  ]);

  // Update refs when props change (without triggering reconnection)
  useEffect(() => {
    filtersRef.current = filters;
  }, [filtersString]);

  useEffect(() => {
    onAnomalyRef.current = onAnomaly;
  }, [onAnomaly]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    throttleMsRef.current = throttleMs;
  }, [throttleMs]);

  const throttledCallback = useRef((anomaly: AnomalyEvent) => {
    pendingAnomaliesRef.current.push(anomaly);
    const now = Date.now();

    if (now - lastUpdateRef.current >= throttleMsRef.current) {
      pendingAnomaliesRef.current.forEach((a) => onAnomalyRef.current(a));
      pendingAnomaliesRef.current = [];
      lastUpdateRef.current = now;
    }
  });

  const connect = useRef(async () => {
    if (!enabledRef.current || isConnectingRef.current || isDisabledRef.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;

    // Rate limiting: prevent too many connection attempts
    if (timeSinceLastAttempt < minTimeBetweenConnections) {
      console.warn(`[WebSocket] Rate limiting: ${minTimeBetweenConnections - timeSinceLastAttempt}ms until next connection allowed`);
      return;
    }

    // Reset connection attempt count if enough time has passed
    if (timeSinceLastAttempt > 60000) { // 1 minute
      connectionAttemptCountRef.current = 0;
    }

    // Check if we've exceeded max connections per minute
    if (connectionAttemptCountRef.current >= maxConnectionsPerMinute) {
      console.error(`[WebSocket] Too many connection attempts (${connectionAttemptCountRef.current} in last minute). Disabling WebSocket.`);
      isDisabledRef.current = true;
      return;
    }

    // Clean up existing connection first
    if (closeRef.current && typeof closeRef.current === 'function') {
      closeRef.current();
      closeRef.current = null;
    }

    isConnectingRef.current = true;
    lastConnectionAttemptRef.current = now;
    connectionAttemptCountRef.current++;

    try {
      const close = await apiServiceRef.current.streamAnomalies(
        throttledCallback.current,
        filtersRef.current
      );
      closeRef.current = close;
      isConnectingRef.current = false;
      failureCountRef.current = 0; // Reset failure count on success
      connectionAttemptCountRef.current = 0; // Reset on success
      onReconnect?.();
    } catch (error) {
      isConnectingRef.current = false;
      failureCountRef.current++;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isResourceError = errorMessage.includes('Insufficient resources') || 
                              errorMessage.includes('1006') ||
                              errorMessage.includes('failed');
      
      if (isResourceError || failureCountRef.current >= maxFailures) {
        console.error(`[WebSocket] Connection failed ${failureCountRef.current} times. Disabling WebSocket to prevent resource exhaustion.`);
        isDisabledRef.current = true;
        return;
      }
      
      console.error('[WebSocket] Connection failed:', error);
      // Don't auto-reconnect - wait for next filter/enabled change
    }
  });

  // Only connect when enabled changes from false to true, or filters actually change
  useEffect(() => {
    if (!enabled || isDisabledRef.current) {
      if (closeRef.current && typeof closeRef.current === 'function') {
        closeRef.current();
        closeRef.current = null;
      }
      isConnectingRef.current = false;
      if (!enabled) {
        previousFiltersStringRef.current = '';
        failureCountRef.current = 0; // Reset on manual disable
        isDisabledRef.current = false; // Allow re-enabling
      }
      return;
    }

    // Only connect if filters actually changed (or on initial mount when previousFiltersStringRef is empty)
    const filtersChanged = previousFiltersStringRef.current !== filtersString;
    const isInitialMount = previousFiltersStringRef.current === '';
    
    // Early return if filters haven't changed and we're not on initial mount
    if (!filtersChanged && !isInitialMount) {
      return;
    }
    
    // Update the previous filters string BEFORE connecting to prevent race conditions
    previousFiltersStringRef.current = filtersString;
    
    // Add a small delay to prevent rapid reconnections
    const timeoutId = setTimeout(() => {
      // Double-check filters haven't changed during the delay
      if (previousFiltersStringRef.current === filtersString && !isConnectingRef.current) {
        connect.current();
      }
    }, 200); // Increased delay to 200ms
    
    return () => {
      clearTimeout(timeoutId);
      // Don't close connection here - let it stay open if filters haven't changed
      // Only reset connecting flag
      isConnectingRef.current = false;
    };
  }, [enabled, filtersString]); // Removed connect from deps - use ref instead

  const disconnect = useCallback(() => {
    if (closeRef.current && typeof closeRef.current === 'function') {
      closeRef.current();
      closeRef.current = null;
    }
    isConnectingRef.current = false;
    previousFiltersStringRef.current = '';
  }, []);

  const reconnect = useCallback(() => {
    previousFiltersStringRef.current = ''; // Reset to force reconnection
    connect.current();
  }, []);

  return { disconnect, reconnect };
}

