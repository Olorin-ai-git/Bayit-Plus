/**
 * useSpringAnimation Hook - Physics-based Spring Animation
 *
 * Implements realistic spring physics animation using Hooke's law + viscous damping:
 * F = -k × (x - target) - c × v
 */

import { useState, useRef, useEffect } from 'react';

export interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
}

/**
 * Physics-based spring animation hook
 *
 * @param target - Target value to animate towards
 * @param config - Spring physics configuration
 * @returns Current animated value
 */
export function useSpringAnimation(
  target: number,
  { stiffness = 220, damping = 22, mass = 1 }: SpringConfig = {}
): number {
  const [x, setX] = useState(target);
  const xRef = useRef(x);
  const vRef = useRef(0);
  const toRef = useRef(target);
  const lastRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    toRef.current = target;
  }, [target]);

  useEffect(() => {
    xRef.current = x;
  }, [x]);

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    lastRef.current = null;

    const step = (ts: number) => {
      if (lastRef.current == null) {
        lastRef.current = ts;
      }
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000);
      lastRef.current = ts;

      const k = stiffness;
      const c = damping;
      const m = mass;
      const x0 = xRef.current;
      const v0 = vRef.current;
      const to = toRef.current;

      const F = -k * (x0 - to) - c * v0;
      const a = F / m;
      const v1 = v0 + a * dt;
      const x1 = x0 + v1 * dt;

      vRef.current = v1;
      xRef.current = x1;
      setX(x1);

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
