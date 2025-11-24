/**
 * useSpringValue Hook - Physics-based Spring Animation
 * Task: T021
 * Feature: 012-agents-risk-gauges
 *
 * Implements realistic spring physics animation using Hooke's law + viscous damping:
 * F = -k × (x - target) - c × v
 *
 * Default configuration:
 * - stiffness (k): 220 - Controls spring tightness
 * - damping (c): 22 - Controls energy dissipation
 * - mass (m): 1 - Inertial mass
 *
 * Features:
 * - Continuous animation via requestAnimationFrame (60 FPS)
 * - Smooth target transitions when prop changes
 * - Frame time clamping to handle large deltas
 * - Automatic cleanup on unmount
 */

import { useState, useRef, useEffect } from 'react';

export interface SpringConfig {
  /** Spring stiffness constant (k) - higher = tighter spring */
  stiffness?: number;
  /** Damping constant (c) - higher = more energy dissipation */
  damping?: number;
  /** Mass constant (m) - affects inertia */
  mass?: number;
}

/**
 * T021: Physics-based spring animation hook
 *
 * Animates a value using spring physics for realistic motion.
 * Continuously runs requestAnimationFrame to enable smooth target changes.
 *
 * @param target - Target value to animate towards
 * @param config - Spring physics configuration
 * @returns Current animated value
 *
 * @example
 * ```tsx
 * const animatedValue = useSpringValue(riskScore, {
 *   stiffness: 220,
 *   damping: 22,
 *   mass: 1
 * });
 * ```
 */
export function useSpringValue(
  target: number,
  { stiffness = 220, damping = 22, mass = 1 }: SpringConfig = {}
): number {
  const [x, setX] = useState(target);
  const xRef = useRef(x);
  const vRef = useRef(0); // velocity
  const toRef = useRef(target);
  const lastRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Always update the target reference on prop change
  useEffect(() => {
    toRef.current = target;
  }, [target]);

  // Keep xRef in sync to avoid stale closure in RAF loop
  useEffect(() => {
    xRef.current = x;
  }, [x]);

  useEffect(() => {
    // Cancel any prior loop before starting a fresh one
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    lastRef.current = null;

    const step = (ts: number) => {
      if (lastRef.current == null) {
        lastRef.current = ts;
      }
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000); // clamp large frames
      lastRef.current = ts;

      // Spring physics (Hooke's law + viscous damping)
      const k = stiffness;
      const c = damping;
      const m = mass;
      const x0 = xRef.current;
      const v0 = vRef.current;
      const to = toRef.current;

      // F = -k × (x - target) - c × v
      const F = -k * (x0 - to) - c * v0;
      const a = F / m;
      const v1 = v0 + a * dt;
      const x1 = x0 + v1 * dt;

      vRef.current = v1;
      xRef.current = x1;
      setX(x1);

      // Keep running continuously so future target changes animate smoothly
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [stiffness, damping, mass]);

  return x;
}
