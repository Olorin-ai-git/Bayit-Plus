/**
 * useRadarAnimation Hook
 * Feature: 004-new-olorin-frontend
 *
 * Manages scanning ray animation for radar visualization.
 * Provides smooth rotation animation using requestAnimationFrame.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateScanAngle, isAnomalyInScanningRange } from '@shared/utils/radarGeometry';

const SCAN_DURATION_MS = 30000; // 30 seconds per full rotation (matching Olorin)
const ANIMATION_FPS = 60;
const FRAME_INTERVAL_MS = 1000 / ANIMATION_FPS;

export interface RadarAnimationOptions {
  isScanning: boolean;
  scanDuration?: number; // Duration for full rotation in ms (default: 30000)
  scanWidth?: number; // Radians for anomaly glow range (default: 0.26 ~15 degrees)
}

export interface RadarAnimationState {
  scanAngle: number; // Current angle in radians (0-2π)
  isAnimating: boolean;
  elapsedTime: number; // Time elapsed since scan start (ms)
  progress: number; // Scan progress (0-1)
  isAnomalyGlowing: (anomalyAngle: number) => boolean;
}

/**
 * Custom hook for radar scanning animation
 * Uses requestAnimationFrame with 60fps throttling
 * Matches Olorin's 30-second rotation cycle for slower, heavier needle feel
 */
export function useRadarAnimation({
  isScanning,
  scanDuration = SCAN_DURATION_MS,
  scanWidth = 0.26 // ~15 degrees in radians (matching Olorin)
}: RadarAnimationOptions): RadarAnimationState {
  const [state, setState] = useState({
    scanAngle: 0,
    elapsedTime: 0,
    progress: 0
  });
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const lastFrameTimeRef = useRef<number>(Date.now());

  // Animation loop with 60fps throttling (matching Olorin)
  const animate = useCallback(() => {
    if (!isScanning) return;

    const now = Date.now();
    const deltaTime = now - lastFrameTimeRef.current;

    // Only update if enough time has passed (60 FPS throttling)
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

  // Start/stop animation based on isScanning prop
  useEffect(() => {
    if (isScanning) {
      startTimeRef.current = Date.now() - state.elapsedTime;
      lastFrameTimeRef.current = Date.now();
      animate();
    } else {
      // Cancel animation frame when paused
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScanning, animate]);

  // Function to check if an anomaly should glow (±15 degrees range matching Olorin)
  const isAnomalyGlowing = useCallback(
    (anomalyAngle: number): boolean => {
      if (!isScanning) return false;

      const rayAngle = state.scanAngle;

      // Handle angle wrapping at 0/2π boundary
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
