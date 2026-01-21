/**
 * Radar Geometry Utilities
 *
 * Calculation utilities for radar visualization including polar coordinates,
 * sweep paths, and anomaly detection zones.
 */

export interface Point {
  x: number;
  y: number;
}

export interface PolarPoint {
  angle: number;
  radius: number;
}

export interface RadarConfig {
  centerX: number;
  centerY: number;
  radius: number;
}

/**
 * Convert polar coordinates to Cartesian coordinates
 */
export function polarToCartesian(center: Point, radius: number, angleInDegrees: number): Point {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;

  return {
    x: center.x + radius * Math.cos(angleInRadians),
    y: center.y + radius * Math.sin(angleInRadians)
  };
}

/**
 * Convert Cartesian coordinates to polar coordinates
 */
export function cartesianToPolar(center: Point, point: Point): PolarPoint {
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  const radius = Math.sqrt(dx * dx + dy * dy);
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);

  if (angle < 0) {
    angle += 360;
  }

  return { angle, radius };
}

/**
 * Calculate sweep arc path for radar beam
 */
export function calculateSweepPath(config: RadarConfig, startAngle: number, sweepWidth: number): string {
  const endAngle = startAngle + sweepWidth;
  const center = { x: config.centerX, y: config.centerY };

  const start = polarToCartesian(center, config.radius, startAngle);
  const end = polarToCartesian(center, config.radius, endAngle);

  const largeArcFlag = sweepWidth > 180 ? 1 : 0;

  return [
    `M ${config.centerX} ${config.centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${config.radius} ${config.radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z'
  ].join(' ');
}

/**
 * Calculate points for radar grid circles
 */
export function calculateGridCircles(config: RadarConfig, ringCount: number): number[] {
  const rings: number[] = [];
  const step = config.radius / ringCount;

  for (let i = 1; i <= ringCount; i++) {
    rings.push(i * step);
  }

  return rings;
}

/**
 * Calculate radar crosshair lines
 */
export function calculateCrosshairLines(config: RadarConfig, lineCount: number = 8): Point[][] {
  const lines: Point[][] = [];
  const angleStep = 360 / lineCount;
  const center = { x: config.centerX, y: config.centerY };

  for (let i = 0; i < lineCount; i++) {
    const angle = i * angleStep;
    const end = polarToCartesian(center, config.radius, angle);

    lines.push([center, end]);
  }

  return lines;
}

/**
 * Check if a point is within the radar sweep
 */
export function isPointInSweep(
  center: Point,
  point: Point,
  sweepAngle: number,
  sweepWidth: number
): boolean {
  const polar = cartesianToPolar(center, point);

  let normalizedSweepAngle = sweepAngle % 360;
  if (normalizedSweepAngle < 0) normalizedSweepAngle += 360;

  let normalizedPointAngle = polar.angle % 360;
  if (normalizedPointAngle < 0) normalizedPointAngle += 360;

  const sweepStart = normalizedSweepAngle;
  const sweepEnd = (normalizedSweepAngle + sweepWidth) % 360;

  if (sweepStart < sweepEnd) {
    return normalizedPointAngle >= sweepStart && normalizedPointAngle <= sweepEnd;
  } else {
    return normalizedPointAngle >= sweepStart || normalizedPointAngle <= sweepEnd;
  }
}

/**
 * Calculate anomaly detection zone
 */
export function calculateAnomalyZone(
  config: RadarConfig,
  angle: number,
  innerRadius: number,
  outerRadius: number,
  arcWidth: number
): string {
  const center = { x: config.centerX, y: config.centerY };
  const startAngle = angle - arcWidth / 2;
  const endAngle = angle + arcWidth / 2;

  const outerStart = polarToCartesian(center, outerRadius, startAngle);
  const outerEnd = polarToCartesian(center, outerRadius, endAngle);
  const innerStart = polarToCartesian(center, innerRadius, startAngle);
  const innerEnd = polarToCartesian(center, innerRadius, endAngle);

  const largeArcFlag = arcWidth > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z'
  ].join(' ');
}
