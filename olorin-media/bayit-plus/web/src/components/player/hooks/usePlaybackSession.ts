/**
 * usePlaybackSession Hook
 * Manages playback session creation, heartbeat, and termination
 * Enforces concurrent stream limits
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { usePlaybackHeartbeat } from '@/hooks/usePlaybackHeartbeat';
import { deviceService } from '@/services/deviceService';

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
      console.warn('Heartbeat failed:', err);
    },
  });

  /**
   * Create playback session
   */
  const createSession = useCallback(async () => {
    if (!enabled || !contentId || sessionCreatedRef.current || isCreatingSession) {
      return;
    }

    setIsCreatingSession(true);
    setError(null);

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
      console.log('Playback session created:', response.data.session_id);
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.detail) {
        const limitError = err.response.data.detail as ConcurrentStreamLimitError;
        setError(limitError);

        if (onLimitExceeded) {
          onLimitExceeded(limitError);
        }

        console.error('Concurrent stream limit exceeded:', limitError);
      } else {
        console.error('Failed to create playback session:', err);
      }
    } finally {
      setIsCreatingSession(false);
    }
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

      console.log('Playback session ended:', sessionId);
      setSessionId(null);
      sessionCreatedRef.current = false;
    } catch (err) {
      console.warn('Failed to end playback session:', err);
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
          console.warn('Failed to end session on cleanup:', err);
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
