import { useCallback, useEffect, useRef, useState } from 'react';

const TIMER_STEP_MINUTES = 5;
const TIMER_MIN_MINUTES = 5;
const TIMER_MAX_MINUTES = 60;
const FADE_DURATION_MS = 5000;
const FADE_STEP_MS = 200;
const FADE_STEPS = Math.floor(FADE_DURATION_MS / FADE_STEP_MS);
const COUNTDOWN_INTERVAL_MS = 1000;

interface UseSleepTimerOptions {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onTimerComplete?: () => void;
}

interface UseSleepTimerReturn {
  isActive: boolean;
  remainingSeconds: number;
  selectedDurationMinutes: number | null;
  startTimer: (minutes: number) => void;
  extendTimer: (minutes?: number) => void;
  cancelTimer: () => void;
  timerOptions: number[];
}

export function useSleepTimer(options: UseSleepTimerOptions): UseSleepTimerReturn {
  const { audioRef, onTimerComplete } = options;

  const [isActive, setIsActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number | null>(null);

  const targetTimestampRef = useRef<number>(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalVolumeRef = useRef<number>(1);
  const onTimerCompleteRef = useRef(onTimerComplete);

  onTimerCompleteRef.current = onTimerComplete;

  const timerOptions: number[] = [];
  for (let m = TIMER_MIN_MINUTES; m <= TIMER_MAX_MINUTES; m += TIMER_STEP_MINUTES) {
    timerOptions.push(m);
  }

  const clearAllIntervals = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const fadeOutAndPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    originalVolumeRef.current = audio.volume;
    const startVolume = audio.volume;
    let step = 0;

    fadeIntervalRef.current = setInterval(() => {
      step++;
      const progress = step / FADE_STEPS;
      const newVolume = startVolume * (1 - progress);

      if (audio) {
        audio.volume = Math.max(0, newVolume);
      }

      if (step >= FADE_STEPS) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        if (audio) {
          audio.pause();
          audio.volume = originalVolumeRef.current;
        }
        onTimerCompleteRef.current?.();
      }
    }, FADE_STEP_MS);
  }, [audioRef]);

  const startCountdown = useCallback(() => {
    clearAllIntervals();

    countdownIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetTimestampRef.current - now) / COUNTDOWN_INTERVAL_MS));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setIsActive(false);
        setSelectedDurationMinutes(null);
        fadeOutAndPause();
      }
    }, COUNTDOWN_INTERVAL_MS);
  }, [clearAllIntervals, fadeOutAndPause]);

  const startTimer = useCallback((minutes: number) => {
    const clamped = Math.max(TIMER_MIN_MINUTES, Math.min(TIMER_MAX_MINUTES, minutes));
    const durationMs = clamped * 60 * COUNTDOWN_INTERVAL_MS;

    targetTimestampRef.current = Date.now() + durationMs;
    setRemainingSeconds(clamped * 60);
    setSelectedDurationMinutes(clamped);
    setIsActive(true);
    startCountdown();
  }, [startCountdown]);

  const extendTimer = useCallback((minutes: number = TIMER_STEP_MINUTES) => {
    if (!isActive) return;

    const extensionMs = minutes * 60 * COUNTDOWN_INTERVAL_MS;
    targetTimestampRef.current += extensionMs;

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((targetTimestampRef.current - now) / COUNTDOWN_INTERVAL_MS));
    setRemainingSeconds(remaining);
  }, [isActive]);

  const cancelTimer = useCallback(() => {
    clearAllIntervals();
    setIsActive(false);
    setRemainingSeconds(0);
    setSelectedDurationMinutes(null);
    targetTimestampRef.current = 0;

    const audio = audioRef.current;
    if (audio && audio.volume < originalVolumeRef.current) {
      audio.volume = originalVolumeRef.current;
    }
  }, [clearAllIntervals, audioRef]);

  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, [clearAllIntervals]);

  return {
    isActive,
    remainingSeconds,
    selectedDurationMinutes,
    startTimer,
    extendTimer,
    cancelTimer,
    timerOptions,
  };
}
