/**
 * Rate Limiting Hook
 * Client-side rate limiting for form submissions and API calls
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface RateLimitState {
  isLimited: boolean;
  remainingAttempts: number;
  resetTime: number | null;
  timeUntilReset: number;
}

interface UseRateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  storageKey?: string;
}

const STORAGE_PREFIX = 'rateLimit_';

/**
 * Hook for client-side rate limiting
 * Uses localStorage to persist rate limit state across page refreshes
 */
export const useRateLimit = (options: UseRateLimitOptions): {
  state: RateLimitState;
  checkLimit: () => boolean;
  recordAttempt: () => void;
  reset: () => void;
} => {
  const { maxAttempts, windowMs, storageKey = 'default' } = options;
  const fullKey = `${STORAGE_PREFIX}${storageKey}`;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getStoredState = useCallback((): { attempts: number[]; resetTime: number | null } => {
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        const validAttempts = (parsed.attempts || []).filter(
          (time: number) => now - time < windowMs
        );
        return { attempts: validAttempts, resetTime: parsed.resetTime };
      }
    } catch {
      // Ignore storage errors
    }
    return { attempts: [], resetTime: null };
  }, [fullKey, windowMs]);

  const [state, setState] = useState<RateLimitState>(() => {
    const { attempts } = getStoredState();
    const remaining = Math.max(0, maxAttempts - attempts.length);
    const oldestAttempt = attempts.length > 0 ? Math.min(...attempts) : null;
    const resetTime = oldestAttempt ? oldestAttempt + windowMs : null;

    return {
      isLimited: attempts.length >= maxAttempts,
      remainingAttempts: remaining,
      resetTime,
      timeUntilReset: resetTime ? Math.max(0, resetTime - Date.now()) : 0,
    };
  });

  // Update time until reset periodically
  useEffect(() => {
    if (state.isLimited && state.resetTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeUntilReset = Math.max(0, (state.resetTime || 0) - now);

        if (timeUntilReset <= 0) {
          const { attempts } = getStoredState();
          const remaining = Math.max(0, maxAttempts - attempts.length);
          setState((prev) => ({
            ...prev,
            isLimited: attempts.length >= maxAttempts,
            remainingAttempts: remaining,
            timeUntilReset: 0,
          }));
        } else {
          setState((prev) => ({ ...prev, timeUntilReset }));
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isLimited, state.resetTime, getStoredState, maxAttempts]);

  const checkLimit = useCallback((): boolean => {
    const { attempts } = getStoredState();
    return attempts.length < maxAttempts;
  }, [getStoredState, maxAttempts]);

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    const { attempts } = getStoredState();
    const newAttempts = [...attempts, now];

    try {
      localStorage.setItem(fullKey, JSON.stringify({ attempts: newAttempts, resetTime: now + windowMs }));
    } catch {
      // Ignore storage errors
    }

    const remaining = Math.max(0, maxAttempts - newAttempts.length);
    const resetTime = now + windowMs;

    setState({
      isLimited: newAttempts.length >= maxAttempts,
      remainingAttempts: remaining,
      resetTime,
      timeUntilReset: windowMs,
    });
  }, [getStoredState, fullKey, maxAttempts, windowMs]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(fullKey);
    } catch {
      // Ignore storage errors
    }
    setState({
      isLimited: false,
      remainingAttempts: maxAttempts,
      resetTime: null,
      timeUntilReset: 0,
    });
  }, [fullKey, maxAttempts]);

  return { state, checkLimit, recordAttempt, reset };
};

export default useRateLimit;
