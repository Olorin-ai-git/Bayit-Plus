import { useEffect, useRef, useState } from 'react';

export interface RadarAnimationConfig {
  rotationSpeed?: number; // Degrees per second
  enabled?: boolean;
}

export interface RadarAnimationState {
  angle: number;
  isAnimating: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Radar Animation Hook
 *
 * Provides smooth 60 FPS rotation animation using requestAnimationFrame.
 * Maintains consistent rotation speed regardless of frame rate.
 *
 * @param config - Animation configuration
 * @returns Animation state and control functions
 */
export function useRadarAnimation(config: RadarAnimationConfig = {}): RadarAnimationState {
  const { rotationSpeed = 30, enabled = true } = config;

  const [angle, setAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(enabled);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isAnimating) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = now;

      setAngle(prevAngle => {
        const newAngle = prevAngle + (rotationSpeed * delta);
        return newAngle >= 360 ? newAngle - 360 : newAngle;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnimating, rotationSpeed]);

  const start = () => {
    lastTimeRef.current = Date.now();
    setIsAnimating(true);
  };

  const stop = () => {
    setIsAnimating(false);
  };

  const reset = () => {
    setAngle(0);
    lastTimeRef.current = Date.now();
  };

  return {
    angle,
    isAnimating,
    start,
    stop,
    reset
  };
}
