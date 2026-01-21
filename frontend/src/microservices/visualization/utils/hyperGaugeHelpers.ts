/**
 * Helper Utilities for HyperGauge Component
 *
 * Extracted from HyperGauge.tsx for file size compliance (<200 lines per file).
 * Contains mathematical utility functions for gauge calculations.
 *
 * NO HARDCODED VALUES - All calculations use provided parameters.
 */

import { Point } from '../types/HyperGaugeTypes';

/**
 * Convert value to angle in degrees
 *
 * @param value - Current value (will be clamped to 0-max range)
 * @param max - Maximum value on scale
 * @param start - Start angle in degrees
 * @param end - End angle in degrees
 * @returns Calculated angle in degrees
 */
export function valueToAngle(
  value: number,
  max: number,
  start: number,
  end: number
): number {
  const clamped = Math.max(0, Math.min(value, max));
  const t = max === 0 ? 0 : clamped / max;
  return start + (end - start) * t;
}

/**
 * Convert polar coordinates to Cartesian coordinates
 *
 * @param cx - Center X coordinate
 * @param cy - Center Y coordinate
 * @param r - Radius
 * @param angleDeg - Angle in degrees (0° = top, increases clockwise)
 * @returns Cartesian point {x, y}
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): Point {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + Math.cos(rad) * r,
    y: cy + Math.sin(rad) * r,
  };
}

/**
 * Generate SVG arc path
 *
 * @param cx - Center X coordinate
 * @param cy - Center Y coordinate
 * @param r - Arc radius
 * @param startAngle - Start angle in degrees
 * @param endAngle - End angle in degrees
 * @returns SVG path string for arc
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
 * Sanitize and validate numeric input
 *
 * @param value - Input value to validate
 * @param defaultValue - Default value if validation fails
 * @param min - Minimum allowed value (optional)
 * @returns Validated number or default
 */
export function sanitizeNumeric(
  value: number,
  defaultValue: number,
  min?: number
): number {
  if (!Number.isFinite(value)) {
    return defaultValue;
  }
  if (min !== undefined && value < min) {
    return defaultValue;
  }
  return value;
}
