import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVideoPreviewOptions {
  duration?: number; // Preview duration in milliseconds
  autoStart?: boolean; // Start preview automatically
  startDelay?: number; // Delay before starting preview
  onComplete?: () => void; // Callback when preview completes
}

interface UseVideoPreviewReturn {
  isPlaying: boolean;
  showPoster: boolean;
  startPreview: () => void;
  stopPreview: () => void;
  resetPreview: () => void;
  remainingTime: number;
}

/**
 * useVideoPreview Hook
 * Manages 5-second video preview state with auto-stop functionality.
 * Can be used with any video player component.
 */
export function useVideoPreview(options: UseVideoPreviewOptions = {}): UseVideoPreviewReturn {
  const {
    duration = 5000,
    autoStart = true,
    startDelay = 1000,
    onComplete,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const [remainingTime, setRemainingTime] = useState(duration);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Start the preview
  const startPreview = useCallback(() => {
    clearTimers();

    setIsPlaying(true);
    setShowPoster(false);
    setRemainingTime(duration);
    startTimeRef.current = Date.now();

    // Update remaining time every 100ms
    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      setRemainingTime(remaining);
    }, 100);

    // Stop after duration
    timerRef.current = setTimeout(() => {
      stopPreview();
      onComplete?.();
    }, duration);
  }, [duration, onComplete, clearTimers]);

  // Stop the preview
  const stopPreview = useCallback(() => {
    clearTimers();
    setIsPlaying(false);
    setShowPoster(true);
    setRemainingTime(duration);
  }, [duration, clearTimers]);

  // Reset to initial state
  const resetPreview = useCallback(() => {
    clearTimers();
    setIsPlaying(false);
    setShowPoster(true);
    setRemainingTime(duration);
  }, [duration, clearTimers]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (autoStart) {
      const startTimer = setTimeout(() => {
        startPreview();
      }, startDelay);

      return () => {
        clearTimeout(startTimer);
        clearTimers();
      };
    }
    return clearTimers;
  }, [autoStart, startDelay, startPreview, clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  return {
    isPlaying,
    showPoster,
    startPreview,
    stopPreview,
    resetPreview,
    remainingTime,
  };
}

export default useVideoPreview;
