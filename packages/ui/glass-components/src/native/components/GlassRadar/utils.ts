/**
 * GlassRadar Utilities
 *
 * Geometry calculations and helper functions for radar visualization
 */

export const RADAR_SIZE = 700;
export const RADAR_CENTER = RADAR_SIZE / 2;

/**
 * Convert polar coordinates to Cartesian
 */
export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleRadians: number
): { x: number; y: number } {
  return {
    x: centerX + Math.cos(angleRadians) * radius,
    y: centerY + Math.sin(angleRadians) * radius,
  };
}

/**
 * Calculate scan angle based on elapsed time
 */
export function calculateScanAngle(elapsedTimeMs: number, durationMs: number): number {
  const progress = (elapsedTimeMs % durationMs) / durationMs;
  return progress * 2 * Math.PI;
}

/**
 * Check if anomaly is in scanning range
 */
export function isAnomalyInScanningRange(
  anomalyAngle: number,
  scanAngle: number,
  scanWidth: number = 0.26
): boolean {
  const angleDiff = Math.abs(
    Math.atan2(
      Math.sin(anomalyAngle - scanAngle),
      Math.cos(anomalyAngle - scanAngle)
    )
  );
  return angleDiff <= scanWidth;
}
