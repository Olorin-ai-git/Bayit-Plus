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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

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
    } catch (err) {
      logger.error('Failed to fetch upload queue', 'useUploadQueue', err);
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Connects to WebSocket for real-time updates
   */
  const connectWebSocket = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        logger.warn('No auth token found, skipping WebSocket connection', 'useUploadQueue');
        return;
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsProtocol =
        API_BASE_URL.startsWith('https') || window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}://${wsHost}/api/v1/admin/uploads/ws?token=${token}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info('✅ Uploads WebSocket connected', 'useUploadQueue');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
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
      };

      ws.onclose = () => {
        logger.warn('[WebSocket] Connection closed', 'useUploadQueue');
        setConnected(false);
        wsRef.current = null;

        // Reconnect with exponential backoff
        if (reconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = WS_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current - 1);
          logger.info(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`, 'useUploadQueue');
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      logger.error('[WebSocket] Failed to connect', 'useUploadQueue', err);
    }
  }, []);

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
    loading,
    error,
    refreshQueue,
    connectWebSocket,
    disconnectWebSocket,
  };
};
