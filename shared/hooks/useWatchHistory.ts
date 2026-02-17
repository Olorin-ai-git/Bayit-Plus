/**
 * useWatchHistory Hook - Watch progress tracking and continue watching.
 *
 * Provides progress reporting with configurable interval and continue watching list.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useWatchHistoryStore } from '../stores/watchHistoryStore';

interface UseWatchHistoryOptions {
  fetchOnMount?: boolean;
}

export function useWatchHistory(options: UseWatchHistoryOptions = {}) {
  const { fetchOnMount = true } = options;
  const store = useWatchHistoryStore();

  useEffect(() => {
    if (fetchOnMount && store.continueWatching.length === 0) {
      store.fetchContinueWatching();
    }
  }, [fetchOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    continueWatching: store.continueWatching,
    getProgress: store.getProgress,
    updateProgress: store.updateProgress,
    isLoading: store.isLoading,
    error: store.error,
    refresh: store.fetchContinueWatching,
  };
}

/**
 * useProgressReporter - Automatically reports watch progress at intervals.
 *
 * Call this in the player component to periodically sync progress to the server.
 */
interface ProgressReporterOptions {
  contentId: string;
  contentType?: string;
  intervalMs?: number;
  enabled?: boolean;
}

export function useProgressReporter(options: ProgressReporterOptions) {
  const {
    contentId,
    contentType = 'vod',
    intervalMs = 10000,
    enabled = true,
  } = options;

  const store = useWatchHistoryStore();
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updatePosition = useCallback((currentTime: number, duration: number) => {
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
  }, []);

  useEffect(() => {
    if (!enabled || !contentId) {
      return;
    }

    intervalRef.current = setInterval(() => {
      if (currentTimeRef.current > 0 && durationRef.current > 0) {
        store.updateProgress(
          contentId,
          contentType,
          currentTimeRef.current,
          durationRef.current,
        );
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Report final position on unmount
      if (currentTimeRef.current > 0 && durationRef.current > 0) {
        store.updateProgress(
          contentId,
          contentType,
          currentTimeRef.current,
          durationRef.current,
        );
      }
    };
  }, [contentId, contentType, intervalMs, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { updatePosition };
}
