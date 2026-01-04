/**
 * Risk Calculation and Visualization Helpers
 * Utilities for risk level classification, color coding, and label generation
 */

import { RiskThresholds, RiskColors } from '../types/agent.types';

/**
 * Determine risk color based on value and thresholds
 */
export function getRiskColor(
  value: number,
  thresholds: RiskThresholds,
  colors: RiskColors
): string {
  if (value >= thresholds.critical) return colors.critical;
  if (value >= thresholds.high) return colors.high;
  if (value >= thresholds.medium) return colors.medium;
  return colors.low;
}

/**
 * Determine tools color based on usage count
 * Green: 0-5, Yellow: 6-10, Orange: 11-15, Red: 16+
 */
export function getToolsColor(toolsUsed: number): string {
  if (toolsUsed >= 16) return '#EF4444'; // red-500
  if (toolsUsed >= 11) return '#F59E0B'; // amber-500
  if (toolsUsed >= 6) return '#EAB308'; // yellow-500
  return '#10B981'; // green-500
}

/**
 * Check if risk score is severe (above pulse threshold)
 */
export function isSevere(risk: number, threshold: number): boolean {
  return risk >= threshold;
}

/**
 * Get human-readable risk level label
 */
export function getRiskLabel(
  value: number,
  thresholds: RiskThresholds
): string {
  if (value >= thresholds.critical) return 'CRITICAL';
  if (value >= thresholds.high) return 'HIGH';
  if (value >= thresholds.medium) return 'MEDIUM';
  return 'LOW';
}
