/**
 * usePlaybackSession Hook
 * Manages playback session creation, heartbeat, and termination
 * Enforces concurrent stream limits
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { usePlaybackHeartbeat } from '@/hooks/usePlaybackHeartbeat';
import { deviceService } from '@/services/deviceService';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import logger from '@/utils/logger';

const sessionLogger = logger.scope('PlaybackSession');

interface UsePlaybackSessionOptions {
  contentId: string | undefined;
  contentType: 'vod' | 'live' | 'podcast' | 'radio';
  isPlaying: boolean;
  onLimitExceeded?: (error: ConcurrentStreamLimitError) => void;
  enabled?: boolean;
}

interface ConcurrentStreamLimitError {
  code: string;
  message: string;
  max_streams: number;
  active_sessions: number;
  active_devices: Array<{
    device_id: string;
    device_name: string;
    content_id: string;
  }>;
}

interface PlaybackSession {
  session_id: string;
  user_id: string;
  device_id: string;
  content_id: string;
  content_type: string;
  started_at: string;
}

export const usePlaybackSession = ({
  contentId,
  contentType,
  isPlaying,
  onLimitExceeded,
  enabled = true,
}: UsePlaybackSessionOptions) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<ConcurrentStreamLimitError | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const sessionCreatedRef = useRef(false);

  // Use heartbeat hook to maintain session liveness
  usePlaybackHeartbeat({
    sessionId,
    isPlaying,
    interval: 30000, // 30 seconds
    onError: (err) => {
      sessionLogger.warn('Heartbeat failed', err);
    },
  });

  /**
   * Sleep utility for retry backoff
   */
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Helper to decode JWT and check expiration
   */
  const tokenWillExpireSoon = (): boolean => {
    const token = useAuthStore.getState().token;
    if (!token) return false;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;

      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      return expirationTime - now < fiveMinutes;
    } catch {
      return false;
    }
  };

  /**
   * Create playback session with retry logic and automatic token refresh
   */
  const createSession = useCallback(async () => {
    if (!enabled || !contentId || sessionCreatedRef.current || isCreatingSession) {
      return;
    }

    setIsCreatingSession(true);
    setError(null);

    const maxRetries = 3;
    let lastError: any = null;

    // Check if token needs refresh before attempting session creation
    if (tokenWillExpireSoon()) {
      sessionLogger.info('Token expiring soon, refreshing before playback session...');
      const refreshed = await useAuthStore.getState().refreshAccessToken();
      if (!refreshed) {
        sessionLogger.error('Token refresh failed before session creation');
        setIsCreatingSession(false);
        setError({
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Failed to refresh authentication token',
        });
        return;
      }
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const deviceId = await deviceService.generateDeviceId();
        const deviceName = deviceService.getDeviceName();

        const response = await axios.post<PlaybackSession>('/api/v1/playback/session/start', {
          device_id: deviceId,
          content_id: contentId,
          content_type: contentType,
          device_name: deviceName,
          ip_address: undefined, // Server will capture from request
        });

        setSessionId(response.data.session_id);
        sessionCreatedRef.current = true;
        sessionLogger.info('Playback session created', { sessionId: response.data.session_id });
        setIsCreatingSession(false);
        return;
      } catch (err: any) {
        lastError = err;

        // Handle different error types
        if (err.response?.status === 401) {
          sessionLogger.warn(`Playback session 401 error (attempt ${attempt}/${maxRetries})`, {
            status: err.response.status,
            detail: err.response?.data?.detail,
            hasToken: !!useAuthStore.getState().token,
          });

          // Try to refresh token and retry
          if (attempt < maxRetries) {
            sessionLogger.info('Attempting token refresh and retry...');
            try {
              const refreshed = await useAuthStore.getState().refreshAccessToken();
              if (refreshed) {
                // Exponential backoff before retry: 500ms, 1000ms, 2000ms
                const backoffMs = Math.pow(2, attempt - 1) * 500;
                sessionLogger.debug(`Retrying session creation in ${backoffMs}ms...`);
                await sleep(backoffMs);
                continue;
              } else {
                // Token refresh failed, token likely invalid
                sessionLogger.error('Token refresh failed, cannot retry session creation');
                setError({
                  code: 'AUTH_FAILED',
                  message: 'Authentication required for playback session',
                });
                setIsCreatingSession(false);
                return;
              }
            } catch (refreshError) {
              sessionLogger.error('Error refreshing token', refreshError);
              setError({
                code: 'AUTH_FAILED',
                message: 'Authentication required for playback session',
              });
              setIsCreatingSession(false);
              return;
            }
          } else {
            // Max retries reached on 401 error
            sessionLogger.error('Max retries exceeded: Authentication failed (401)');
            setError({
              code: 'AUTH_FAILED',
              message: 'Authentication required for playback session',
            });
          }
        } else if (err.response?.status === 403 && err.response?.data?.detail) {
          // Concurrent stream limit - don't retry
          const limitError = err.response.data.detail as ConcurrentStreamLimitError;
          setError(limitError);

          if (onLimitExceeded) {
            onLimitExceeded(limitError);
          }

          sessionLogger.warn('Concurrent stream limit exceeded', limitError);
        } else if (attempt < maxRetries) {
          // Transient error - retry with exponential backoff
          const backoffMs = Math.pow(2, attempt) * 500;
          sessionLogger.warn(`Session creation failed (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms`, {
            status: err.response?.status,
            message: err.message,
            detail: err.response?.data?.detail,
          });
          await sleep(backoffMs);
          continue;
        } else {
          // Max retries reached on non-401 error
          sessionLogger.error('Max retries exceeded: Failed to create playback session', {
            status: err.response?.status,
            message: err.message,
            detail: err.response?.data?.detail,
          });
        }
      }
    }

    // All retries exhausted
    if (lastError && lastError.response?.status !== 401 && lastError.response?.status !== 403) {
      sessionLogger.error('Failed to create playback session after multiple attempts');
      setError({
        code: 'SESSION_CREATION_FAILED',
        message: 'Failed to create playback session after multiple attempts',
      });
    }

    setIsCreatingSession(false);
  }, [enabled, contentId, contentType, isCreatingSession, onLimitExceeded]);

  /**
   * End playback session
   */
  const endSession = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    try {
      await axios.post('/api/v1/playback/session/end', {
        session_id: sessionId,
      });

      sessionLogger.info('Playback session ended', { sessionId });
      setSessionId(null);
      sessionCreatedRef.current = false;
    } catch (err) {
      sessionLogger.warn('Failed to end playback session', err);
      // Still clear local session state even if API call fails
      setSessionId(null);
      sessionCreatedRef.current = false;
    }
  }, [sessionId]);

  /**
   * Create session when playback starts
   */
  useEffect(() => {
    if (isPlaying && enabled && contentId && !sessionCreatedRef.current) {
      createSession();
    }
  }, [isPlaying, enabled, contentId, createSession]);

  /**
   * End session on unmount or when content changes
   */
  useEffect(() => {
    return () => {
      if (sessionId) {
        // End session on cleanup
        axios.post('/api/v1/playback/session/end', {
          session_id: sessionId,
        }).catch((err) => {
          sessionLogger.warn('Failed to end session on cleanup', err);
        });
      }
    };
  }, [sessionId]);

  return {
    sessionId,
    error,
    isCreatingSession,
    endSession,
  };
};
