/**
 * Simple Eased Animation Hook
 *
 * Extracted from HyperGauge.tsx for file size compliance (<200 lines per file).
 * Provides fallback easing animation for gauges when spring physics is not desired.
 *
 * Uses cubic easeOut timing function for smooth, natural motion.
 * NO HARDCODED VALUES - Duration configurable via parameter.
 */

import { useState, useRef, useEffect } from 'react';

/**
 * Cubic easeOut timing function
 *
 * @param t - Progress value (0-1)
 * @returns Eased value (0-1)
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Simple ease animation hook for numeric values
 *
 * Animates from current value to target value using easeOutCubic timing.
 * Uses requestAnimationFrame for smooth 60fps animation.
 *
 * @param target - Target value to animate towards
 * @param durationMs - Animation duration in milliseconds (from configuration)
 * @returns Current animated value
 *
 * @example
 * ```tsx
 * const animatedValue = useAnimatedValue(riskScore, animationDurationMs);
 * ```
 */
export function useAnimatedValue(target: number, durationMs: number = 900): number {
  const [value, setValue] = useState(target);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(target);
  const toRef = useRef(target);

  useEffect(() => {
    fromRef.current = value;
    toRef.current = target;
    startRef.current = null;

    let rafId = 0;

    const step = (timestamp: number) => {
      if (startRef.current == null) {
        startRef.current = timestamp;
      }

      const elapsed = timestamp - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(progress);

      const currentValue = fromRef.current + (toRef.current - fromRef.current) * eased;
      setValue(currentValue);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs, value]);

  return value;
}
