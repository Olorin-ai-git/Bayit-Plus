/**
 * GlassGauge Utilities
 *
 * Helper functions for gauge calculations
 */

/**
 * Convert value to angle in degrees
 */
export function valueToAngle(
  value: number,
  max: number,
  startAngle: number,
  endAngle: number
): number {
  const clamped = Math.max(0, Math.min(value, max));
  const t = max === 0 ? 0 : clamped / max;
  return startAngle + (endAngle - startAngle) * t;
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
