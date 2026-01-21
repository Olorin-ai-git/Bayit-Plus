/**
 * useUploadProgress Hook
 * WebSocket hook for real-time upload progress tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config/appConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UploadJob {
  job_id: string;
  type: string;
  filename: string;
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  file_size?: number;
  bytes_uploaded: number;
  upload_speed?: number;
  eta_seconds?: number;
  destination_url?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface QueueStats {
  total_jobs: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  total_size_bytes: number;
  uploaded_bytes: number;
}

export interface UploadProgressState {
  stats: QueueStats | null;
  activeJob: UploadJob | null;
  queue: UploadJob[];
  recentCompleted: UploadJob[];
  connected: boolean;
  error: string | null;
}

export const useUploadProgress = () => {
  const [state, setState] = useState<UploadProgressState>({
    stats: null,
    activeJob: null,
    queue: [],
    recentCompleted: [],
    connected: false,
    error: null,
  });

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const getWebSocketUrl = useCallback(async () => {
    // Get auth token
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Convert HTTP(S) URL to WS(S)
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
    return `${wsUrl}/api/v1/admin/uploads/ws?token=${encodeURIComponent(token)}`;
  }, []);

  const connect = useCallback(async () => {
    try {
      const url = await getWebSocketUrl();
      
      // Close existing connection
      if (ws.current) {
        ws.current.close();
      }

      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('Upload WebSocket connected');
        reconnectAttempts.current = 0;
        setState(prev => ({ ...prev, connected: true, error: null }));
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              console.log('Upload service connected:', message.message);
              break;

            case 'queue_update':
              setState(prev => ({
                ...prev,
                stats: message.stats,
                activeJob: message.active_job,
                queue: message.queue || [],
                recentCompleted: message.recent_completed || [],
              }));
              break;

            case 'pong':
              // Heartbeat response
              break;

            case 'error':
              console.error('Upload WebSocket error:', message.message);
              setState(prev => ({ ...prev, error: message.message }));
              break;

            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.current.onerror = (error) => {
        console.error('Upload WebSocket error:', error);
        setState(prev => ({
          ...prev,
          connected: false,
          error: 'WebSocket connection error',
        }));
      };

      ws.current.onclose = () => {
        console.log('Upload WebSocket disconnected');
        setState(prev => ({ ...prev, connected: false }));

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setState(prev => ({
            ...prev,
            error: 'Failed to connect after multiple attempts',
          }));
        }
      };
    } catch (err) {
      console.error('Failed to connect to upload WebSocket:', err);
      setState(prev => ({
        ...prev,
        connected: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      }));
    }
  }, [getWebSocketUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setState(prev => ({ ...prev, connected: false }));
  }, []);

  const sendPing = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    // Setup ping interval (every 30 seconds)
    const pingInterval = setInterval(sendPing, 30000);

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, sendPing]);

  // Helper functions
  const getProgressPercentage = useCallback(() => {
    if (!state.stats) return 0;
    if (state.stats.total_size_bytes === 0) return 0;
    return (state.stats.uploaded_bytes / state.stats.total_size_bytes) * 100;
  }, [state.stats]);

  const formatFileSize = useCallback((bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  const formatUploadSpeed = useCallback((bytesPerSecond?: number) => {
    if (!bytesPerSecond) return 'Calculating...';
    return `${formatFileSize(bytesPerSecond)}/s`;
  }, [formatFileSize]);

  const formatETA = useCallback((seconds?: number) => {
    if (!seconds) return 'Calculating...';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  }, []);

  return {
    // State
    ...state,
    
    // Connection control
    connect,
    disconnect,
    reconnect: connect,
    
    // Helper functions
    getProgressPercentage,
    formatFileSize,
    formatUploadSpeed,
    formatETA,
  };
};

export default useUploadProgress;
