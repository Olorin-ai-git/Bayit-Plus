/**
 * useRadarAnimation Hook
 *
 * Manages scanning ray animation for radar visualization.
 * Provides smooth rotation animation using requestAnimationFrame.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const SCAN_DURATION_MS = 30000; // 30 seconds per full rotation
const ANIMATION_FPS = 60;
const FRAME_INTERVAL_MS = 1000 / ANIMATION_FPS;

export interface RadarAnimationOptions {
  isScanning: boolean;
  scanDuration?: number;
  scanWidth?: number;
}

export interface RadarAnimationState {
  scanAngle: number;
  isAnimating: boolean;
  elapsedTime: number;
  progress: number;
  isAnomalyGlowing: (anomalyAngle: number) => boolean;
}

/**
 * Custom hook for radar scanning animation
 */
export function useRadarAnimation({
  isScanning,
  scanDuration = SCAN_DURATION_MS,
  scanWidth = 0.26
}: RadarAnimationOptions): RadarAnimationState {
  const [state, setState] = useState({
    scanAngle: 0,
    elapsedTime: 0,
    progress: 0
  });
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(Date.now());
  const lastFrameTimeRef = useRef<number>(Date.now());

  const animate = useCallback(() => {
    if (!isScanning) return;

    const now = Date.now();
    const deltaTime = now - lastFrameTimeRef.current;

    if (deltaTime < FRAME_INTERVAL_MS) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    lastFrameTimeRef.current = now;
    const elapsedTime = now - startTimeRef.current;
    const progress = (elapsedTime % scanDuration) / scanDuration;
    const scanAngle = progress * 2 * Math.PI;

    setState({
      scanAngle,
      elapsedTime,
      progress
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isScanning, scanDuration]);

  useEffect(() => {
    if (isScanning) {
      startTimeRef.current = Date.now() - state.elapsedTime;
      lastFrameTimeRef.current = Date.now();
      animate();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScanning, animate]);

  const isAnomalyGlowing = useCallback(
    (anomalyAngle: number): boolean => {
      if (!isScanning) return false;

      const rayAngle = state.scanAngle;
      const angleDiff = Math.abs(
        Math.atan2(
          Math.sin(anomalyAngle - rayAngle),
          Math.cos(anomalyAngle - rayAngle)
        )
      );

      return angleDiff <= scanWidth;
    },
    [isScanning, state.scanAngle, scanWidth]
  );

  return {
    scanAngle: state.scanAngle,
    isAnimating: isScanning,
    elapsedTime: state.elapsedTime,
    progress: state.progress,
    isAnomalyGlowing
  };
}
