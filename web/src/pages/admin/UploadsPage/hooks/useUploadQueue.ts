/**
 * useUploadQueue Hook
 * Manages WebSocket connection and upload queue state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { QueueState, QueueStats, QueueJob } from '../types';
import * as uploadsService from '@/services/uploadsService';
import logger from '@/utils/logger';
import { WS_RECONNECT_DELAY, WS_MAX_RECONNECT_ATTEMPTS } from '../constants';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const initialQueueStats: QueueStats = {
  total_jobs: 0,
  queued: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  total_size_bytes: 0,
  uploaded_bytes: 0,
};

export const useUploadQueue = () => {
  const [queueState, setQueueState] = useState<QueueState>({
    stats: initialQueueStats,
    activeJob: null,
    queuedJobs: [],
    recentCompleted: [],
    queuePaused: false,
    pauseReason: null,
  });

  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0); // Use ref to avoid stale closures

  /**
   * Fetches queue data from API
   */
  const refreshQueue = useCallback(async () => {
    try {
      const queueData = await uploadsService.getUploadQueue();

      setQueueState({
        stats: queueData.stats || initialQueueStats,
        activeJob: queueData.active_job || null,
        queuedJobs: queueData.queue || [],
        recentCompleted: queueData.recent_completed || [],
        queuePaused: queueData.queue_paused || false,
        pauseReason: queueData.pause_reason || null,
      });

      setError(null);
    } catch (err: any) {
      logger.error('Failed to fetch upload queue', 'useUploadQueue', err);
      // Extract detailed error message from API response
      const errorMsg = err?.response?.data?.detail || err?.detail || err?.message || 'Failed to load queue';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Connects to WebSocket for real-time updates
   */
  const connectWebSocket = useCallback(() => {
    try {
      // Get token from the same source as API calls
      const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}');
      const token = authData?.state?.token;

      if (!token) {
        logger.warn('No auth token found, skipping WebSocket connection', 'useUploadQueue');
        setError('Authentication required. Please log in.');
        return;
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      // Construct WebSocket URL based on API base URL
      let wsUrl: string;
      if (API_BASE_URL.startsWith('http')) {
        // Use API_BASE_URL as base (development mode)
        const apiUrl = new URL(API_BASE_URL);
        const wsProtocol = apiUrl.protocol === 'https:' ? 'wss' : 'ws';
        wsUrl = `${wsProtocol}://${apiUrl.host}/api/v1/admin/uploads/ws?token=${token}`;
      } else {
        // Use current host (production mode)
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        wsUrl = `${wsProtocol}://${window.location.host}/api/v1/admin/uploads/ws?token=${token}`;
      }

      logger.info(`[WebSocket] Connecting to: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`, 'useUploadQueue');
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info('[OK] Uploads WebSocket connected', 'useUploadQueue');
        setConnected(true);
        setReconnecting(false);
        setReconnectAttempt(0);
        reconnectAttemptRef.current = 0; // Reset ref on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'queue_update') {
            setQueueState((prev) => ({
              stats: data.stats || prev.stats,
              activeJob: data.active_job !== undefined ? data.active_job : prev.activeJob,
              queuedJobs: data.queue || prev.queuedJobs,
              recentCompleted: data.recent_completed || prev.recentCompleted,
              queuePaused: data.queue_paused !== undefined ? data.queue_paused : prev.queuePaused,
              pauseReason: data.pause_reason !== undefined ? data.pause_reason : prev.pauseReason,
            }));
          }
        } catch (err) {
          logger.error('[WebSocket] Failed to parse message', 'useUploadQueue', err);
        }
      };

      ws.onerror = (error) => {
        logger.error('[WebSocket] Connection error', 'useUploadQueue', error);
        setConnected(false);

        // If we get an error immediately, the endpoint might not exist
        if (reconnectAttemptRef.current === 0) {
          logger.error('[WebSocket] Failed to establish initial connection - endpoint may not exist', 'useUploadQueue');
        }
      };

      ws.onclose = () => {
        logger.warn('[WebSocket] Connection closed', 'useUploadQueue');
        setConnected(false);
        wsRef.current = null;

        // Reconnect with exponential backoff - use ref to avoid stale closure
        const currentAttempt = reconnectAttemptRef.current;
        if (currentAttempt < WS_MAX_RECONNECT_ATTEMPTS) {
          const nextAttempt = currentAttempt + 1;
          reconnectAttemptRef.current = nextAttempt;
          setReconnectAttempt(nextAttempt);
          setReconnecting(true);

          const delay = WS_RECONNECT_DELAY * Math.pow(1.5, nextAttempt - 1);
          logger.info(`[WebSocket] Reconnecting in ${delay}ms (attempt ${nextAttempt})`, 'useUploadQueue');
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          logger.error('[WebSocket] Max reconnection attempts reached', 'useUploadQueue');
          setReconnecting(false);
          setError('WebSocket connection failed after 10 attempts. Using manual refresh.');

          // Could fall back to polling here if needed
          // setInterval(() => refreshQueue(), QUEUE_REFRESH_INTERVAL);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      logger.error('[WebSocket] Failed to connect', 'useUploadQueue', err);
      setError('WebSocket connection failed');
    }
  }, []); // No dependencies - use refs to avoid stale closures

  /**
   * Disconnects WebSocket
   */
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
  }, []);

  // Initialize: fetch queue and connect WebSocket
  useEffect(() => {
    refreshQueue();
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [refreshQueue, connectWebSocket, disconnectWebSocket]);

  return {
    queueState,
    connected,
    reconnecting,
    reconnectAttempt,
    loading,
    error,
    refreshQueue,
    connectWebSocket,
    disconnectWebSocket,
  };
};
