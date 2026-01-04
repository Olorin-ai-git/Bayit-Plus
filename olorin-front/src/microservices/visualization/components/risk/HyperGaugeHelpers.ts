/**
 * HyperGauge Helper Functions
 * Task: T026 (refactored from HyperGauge.tsx)
 * Feature: 002-visualization-microservice
 *
 * Utility functions for gauge calculations and animations.
 */

import { useState, useRef, useEffect } from 'react';
import { TickMark, ValidatedGaugeParams } from './HyperGaugeTypes';

/**
 * Convert value to angle in degrees
 */
export function valueToAngle(value: number, max: number, start: number, end: number): number {
  const clamped = Math.max(0, Math.min(value, max));
  const t = max === 0 ? 0 : clamped / max;
  return start + (end - start) * t;
}

/**
 * Convert polar coordinates to Cartesian
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + Math.cos(rad) * r,
    y: cy + Math.sin(rad) * r,
  };
}

/**
 * Generate SVG arc path
 */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

/**
 * Simple ease animation hook (fallback for needleMode='ease')
 */
export function useAnimatedValue(target: number, durationMs: number = 900): number {
  const [v, setV] = useState(target);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(target);
  const toRef = useRef(target);

  useEffect(() => {
    fromRef.current = v;
    toRef.current = target;
    startRef.current = null;

    let raf = 0;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = easeOutCubic(p);
      setV(fromRef.current + (toRef.current - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return v;
}

/**
 * Validate and sanitize gauge input parameters
 */
export function validateGaugeParams(
  size?: number,
  value?: number,
  max?: number,
  startAngle?: number,
  endAngle?: number
): ValidatedGaugeParams {
  return {
    size: Number.isFinite(size) && size! > 0 ? size! : 280,
    value: Number.isFinite(value) ? Math.max(0, value!) : 0,
    max: Number.isFinite(max) && max! > 0 ? max! : 100,
    startAngle: Number.isFinite(startAngle) ? startAngle! : -120,
    endAngle: Number.isFinite(endAngle) ? endAngle! : 120,
  };
}

/**
 * Generate tick marks for gauge dial
 */
export function generateTickMarks(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  max: number,
  showNumbers: boolean
): TickMark[] {
  const totalTicks = 40;
  const items: TickMark[] = [];

  for (let i = 0; i <= totalTicks; i++) {
    const t = i / totalTicks;
    const a = startAngle + (endAngle - startAngle) * t;
    const rad = (a - 90) * (Math.PI / 180);
    const thick = i % 4 === 0;
    const r1 = radius * (thick ? 1.1 : 1.05);
    const r2 = radius * (thick ? 0.9 : 0.96);
    const x1 = cx + Math.cos(rad) * r1;
    const y1 = cy + Math.sin(rad) * r1;
    const x2 = cx + Math.cos(rad) * r2;
    const y2 = cy + Math.sin(rad) * r2;

    const item: TickMark = { x1, y1, x2, y2, thick };

    if (showNumbers && thick) {
      const rl = radius * 1.18;
      const lx = cx + Math.cos(rad) * rl;
      const ly = cy + Math.sin(rad) * rl;
      const markVal = Math.round(max * t);
      item.label = { x: lx, y: ly, text: String(markVal) };
    }

    items.push(item);
  }

  return items;
}
