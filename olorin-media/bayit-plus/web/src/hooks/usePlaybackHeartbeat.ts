/**
 * usePlaybackHeartbeat Hook
 * Sends heartbeat every 30 seconds during active playback
 */

import { useEffect, useRef } from 'react';
import axios from 'axios';

interface UsePlaybackHeartbeatOptions {
  sessionId: string | null;
  isPlaying: boolean;
  interval?: number; // Default: 30000ms (30 seconds)
  onError?: (error: Error) => void;
}

export const usePlaybackHeartbeat = (options: UsePlaybackHeartbeatOptions) => {
  const { sessionId, isPlaying, interval = 30000, onError } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only send heartbeat if we have a session and playback is active
    if (!sessionId || !isPlaying) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Send initial heartbeat immediately
    sendHeartbeat(sessionId, onError);

    // Set up interval for subsequent heartbeats
    intervalRef.current = setInterval(() => {
      sendHeartbeat(sessionId, onError);
    }, interval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionId, isPlaying, interval, onError]);
};

async function sendHeartbeat(sessionId: string, onError?: (error: Error) => void) {
  try {
    await axios.post('/api/v1/playback/session/heartbeat', {
      session_id: sessionId,
    });

    console.debug('Playback heartbeat sent:', sessionId);
  } catch (error) {
    console.warn('Failed to send playback heartbeat:', error);

    if (onError) {
      onError(error as Error);
    }
  }
}
