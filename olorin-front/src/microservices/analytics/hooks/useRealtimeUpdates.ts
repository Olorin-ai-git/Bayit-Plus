/**
 * useRealtimeUpdates hook for real-time metrics updates.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useEffect, useRef } from 'react';
import { analyticsEventBus } from '../services/eventBus';

export const useRealtimeUpdates = (
  enabled: boolean,
  callback: () => void,
  intervalMs: number = 5000
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      callback();
    }, intervalMs);

    const unsubscribe = analyticsEventBus.onFilterChanged(() => {
      callback();
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      unsubscribe();
    };
  }, [enabled, callback, intervalMs]);
};

