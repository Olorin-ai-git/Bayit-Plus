/**
 * Radar Visualization Geometry Utilities
 * Feature: 004-new-olorin-frontend
 *
 * Mathematical utilities for radar visualization positioning and layout.
 * Uses Olorin corporate color scheme.
 */

import type { PolarCoordinate, CartesianCoordinate, SeverityLevel } from '@shared/types/radar.types';

// ==========================
// Constants
// ==========================

export const RADAR_SIZE = 700;
export const RADAR_CENTER = 350;
export const BASE_RADIUS = 60;
export const RING_SPACING = 50;
export const TICK_LENGTH = 15;
export const ANOMALY_BASE_OFFSET = 8;
export const ANOMALY_STACK_SPACING = 10;

// ==========================
// Coordinate Conversion
// ==========================

/**
 * Convert polar coordinates to Cartesian (SVG) coordinates
 */
export function polarToCartesian(
  polar: PolarCoordinate,
  centerX: number = RADAR_CENTER,
  centerY: number = RADAR_CENTER
): CartesianCoordinate {
  return {
    x: centerX + Math.cos(polar.angle) * polar.radius,
    y: centerY + Math.sin(polar.angle) * polar.radius
  };
}

/**
 * Convert Cartesian coordinates to polar coordinates
 */
export function cartesianToPolar(
  x: number,
  y: number,
  centerX: number = RADAR_CENTER,
  centerY: number = RADAR_CENTER
): PolarCoordinate {
  const dx = x - centerX;
  const dy = y - centerY;
  return {
    angle: Math.atan2(dy, dx),
    radius: Math.sqrt(dx * dx + dy * dy)
  };
}

// ==========================
// Tool Positioning
// ==========================

/**
 * Calculate angle for tool tick based on its index
 * Distributes tools evenly around the circle
 */
export function calculateToolAngle(toolIndex: number, totalTools: number): number {
  if (totalTools === 0) return 0;
  return (toolIndex / totalTools) * 2 * Math.PI;
}

/**
 * Calculate tool tick position on agent ring
 */
export function calculateToolTickPosition(
  toolIndex: number,
  totalTools: number,
  agentRadius: number,
  centerX: number = RADAR_CENTER,
  centerY: number = RADAR_CENTER
): CartesianCoordinate {
  const angle = calculateToolAngle(toolIndex, totalTools);
  return polarToCartesian({ angle, radius: agentRadius }, centerX, centerY);
}

// ==========================
// Agent Ring Layout
// ==========================

/**
 * Calculate agent ring radius with proper spacing
 */
export function calculateAgentRingRadius(
  agentIndex: number,
  baseRadius: number = BASE_RADIUS,
  ringSpacing: number = RING_SPACING
): number {
  return baseRadius + agentIndex * ringSpacing;
}

/**
 * Get all agent ring radii for a given number of agents
 */
export function calculateAllAgentRingRadii(
  agentCount: number,
  baseRadius: number = BASE_RADIUS,
  ringSpacing: number = RING_SPACING
): number[] {
  return Array.from({ length: agentCount }, (_, i) =>
    calculateAgentRingRadius(i, baseRadius, ringSpacing)
  );
}

// ==========================
// Anomaly Positioning
// ==========================

/**
 * Calculate stacked anomaly position along tool radial line
 * Multiple anomalies from same tool are stacked outward
 */
export function calculateAnomalyPosition(
  toolAngle: number,
  agentRadius: number,
  anomalyIndex: number,
  tickLength: number = TICK_LENGTH,
  centerX: number = RADAR_CENTER,
  centerY: number = RADAR_CENTER
): { x: number; y: number; stackIndex: number } {
  const baseDistance = agentRadius + tickLength + ANOMALY_BASE_OFFSET;
  const stackedDistance = baseDistance + anomalyIndex * ANOMALY_STACK_SPACING;

  return {
    x: centerX + Math.cos(toolAngle) * stackedDistance,
    y: centerY + Math.sin(toolAngle) * stackedDistance,
    stackIndex: anomalyIndex
  };
}

// ==========================
// Risk Level Mapping (Olorin Colors)
// ==========================

/**
 * Validate and clamp risk level to 0-100 range
 */
export function validateAndClampRiskLevel(riskLevel: number): number {
  if (typeof riskLevel !== 'number' || isNaN(riskLevel)) {
    console.warn(`[RadarGeometry] Invalid risk level: ${riskLevel}, defaulting to 0`);
    return 0;
  }
  return Math.max(0, Math.min(100, riskLevel));
}

/**
 * Map risk level (0-100) to Olorin corporate color
 * Uses red shades for risk visualization
 */
export function riskLevelToColor(riskLevel: number): string {
  const validated = validateAndClampRiskLevel(riskLevel);
  if (validated > 80) return '#dc2626'; // Critical (red-600)
  if (validated > 60) return '#ef4444'; // High (red-500)
  if (validated > 40) return '#f87171'; // Medium (red-400)
  return '#fca5a5'; // Low (red-300)
}

/**
 * Convert severity level to numeric risk level
 */
export function severityToRiskLevel(severity: SeverityLevel): number {
  const severityMap: Record<SeverityLevel, number> = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 95
  };
  return severityMap[severity] || 0;
}

/**
 * Get Olorin corporate color for agent (purple accent)
 */
export function getAgentColor(agentIndex: number): string {
  // Olorin corporate purple with variations
  const colors = [
    '#A855F7', // Primary purple
    '#C084FC', // Light purple
    '#D8B4FE', // Lighter purple
    '#9333EA', // Dark purple
    '#E9D5FF', // Lightest purple
    '#7C3AED' // Darkest purple
  ];
  const color = colors[agentIndex % colors.length];
  return color ?? '#A855F7'; // Fallback to primary purple
}

// ==========================
// Animation Utilities
// ==========================

/**
 * Check if an anomaly should glow based on scanning ray angle
 * Anomalies glow when the scanning ray passes over them
 */
export function isAnomalyInScanningRange(
  anomalyAngle: number,
  scanAngle: number,
  scanWidth: number = 0.1 // Radians (~5.7 degrees)
): boolean {
  // Normalize angles to 0-2π range
  const normalizeAngle = (angle: number) => {
    const normalized = angle % (2 * Math.PI);
    return normalized < 0 ? normalized + 2 * Math.PI : normalized;
  };

  const normAnomalyAngle = normalizeAngle(anomalyAngle);
  const normScanAngle = normalizeAngle(scanAngle);

  // Check if anomaly is within scan range
  const diff = Math.abs(normAnomalyAngle - normScanAngle);
  const minDiff = Math.min(diff, 2 * Math.PI - diff);

  return minDiff <= scanWidth;
}

/**
 * Calculate scanning ray angle based on elapsed time
 */
export function calculateScanAngle(
  startTime: number,
  currentTime: number,
  rotationSpeed: number = 2 // Full rotations per second
): number {
  const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
  const angle = (elapsed * rotationSpeed * 2 * Math.PI) % (2 * Math.PI);
  return angle;
}
