/**
 * usePlaybackSession Hook
 * Manages playback session creation, heartbeat, and termination
 * Enforces concurrent stream limits
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/services/api';
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
  const isCreatingRef = useRef(false);
  const hasFailedRef = useRef(false);

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
    // Use refs for checks to avoid infinite loops from state changes
    if (!enabled || !contentId || sessionCreatedRef.current || isCreatingRef.current || hasFailedRef.current) {
      return;
    }

    isCreatingRef.current = true;
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
        isCreatingRef.current = false;
        hasFailedRef.current = true;
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

        const response = await api.post('/playback/session/start', {
          device_id: deviceId,
          content_id: contentId,
          content_type: contentType,
          device_name: deviceName,
          ip_address: undefined, // Server will capture from request
        }) as PlaybackSession;

        setSessionId(response.session_id);
        sessionCreatedRef.current = true;
        isCreatingRef.current = false;
        sessionLogger.info('Playback session created', { sessionId: response.session_id });
        setIsCreatingSession(false);
        return;
      } catch (err: any) {
        lastError = err;

        // API interceptor returns error.response.data directly, so we check the structure
        const isAuthError = typeof err?.detail === 'string' &&
          (err.detail.includes('Not authenticated') ||
           err.detail.includes('Could not validate') ||
           err.detail.includes('Invalid') ||
           err.detail.includes('expired'));
        const isConcurrentLimitError = err?.detail?.code === 'CONCURRENT_STREAM_LIMIT_EXCEEDED';

        // Handle different error types
        if (isAuthError) {
          sessionLogger.warn(`Playback session auth error (attempt ${attempt}/${maxRetries})`, {
            detail: err?.detail,
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
                isCreatingRef.current = false;
                hasFailedRef.current = true;
                setError({
                  code: 'AUTH_FAILED',
                  message: 'Authentication required for playback session',
                });
                setIsCreatingSession(false);
                return;
              }
            } catch (refreshError) {
              sessionLogger.error('Error refreshing token', refreshError);
              isCreatingRef.current = false;
              hasFailedRef.current = true;
              setError({
                code: 'AUTH_FAILED',
                message: 'Authentication required for playback session',
              });
              setIsCreatingSession(false);
              return;
            }
          } else {
            // Max retries reached on auth error
            sessionLogger.error('Max retries exceeded: Authentication failed');
            hasFailedRef.current = true;
            setError({
              code: 'AUTH_FAILED',
              message: 'Authentication required for playback session',
            });
          }
        } else if (isConcurrentLimitError) {
          // Concurrent stream limit - don't retry
          const limitError = err.detail as ConcurrentStreamLimitError;
          hasFailedRef.current = true;
          isCreatingRef.current = false;
          setError(limitError);
          setIsCreatingSession(false);

          if (onLimitExceeded) {
            onLimitExceeded(limitError);
          }

          sessionLogger.warn('Concurrent stream limit exceeded', limitError);
          return;
        } else if (attempt < maxRetries) {
          // Transient error - retry with exponential backoff
          const backoffMs = Math.pow(2, attempt) * 500;
          sessionLogger.warn(`Session creation failed (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms`, {
            message: err?.message || err?.detail,
          });
          await sleep(backoffMs);
          continue;
        } else {
          // Max retries reached on non-auth error
          sessionLogger.error('Max retries exceeded: Failed to create playback session', {
            message: err?.message || err?.detail,
          });
        }
      }
    }

    // All retries exhausted
    hasFailedRef.current = true;
    isCreatingRef.current = false;
    const isAuthFailure = typeof lastError?.detail === 'string' &&
      lastError.detail.includes('authenticated');
    const isLimitFailure = lastError?.detail?.code === 'CONCURRENT_STREAM_LIMIT_EXCEEDED';
    if (lastError && !isAuthFailure && !isLimitFailure) {
      sessionLogger.error('Failed to create playback session after multiple attempts');
      setError({
        code: 'SESSION_CREATION_FAILED',
        message: 'Failed to create playback session after multiple attempts',
      });
    }

    setIsCreatingSession(false);
  }, [enabled, contentId, contentType, onLimitExceeded]);

  /**
   * End playback session
   */
  const endSession = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    try {
      await api.post('/playback/session/end', {
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
   * Reset refs when content changes to allow fresh session creation
   */
  useEffect(() => {
    sessionCreatedRef.current = false;
    isCreatingRef.current = false;
    hasFailedRef.current = false;
    setError(null);
  }, [contentId]);

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
        api.post('/playback/session/end', {
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
