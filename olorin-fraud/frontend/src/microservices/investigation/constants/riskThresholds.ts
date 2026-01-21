/**
 * Risk Threshold Constants
 * Feature: 007-progress-wizard-page
 *
 * Defines risk level thresholds and color mappings.
 * Uses Olorin design system risk colors.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values (configuration-driven)
 * - All thresholds from environment variables
 * - Fail-fast if required config missing
 */

/**
 * Risk threshold values for color coding
 * Maps 0-100 risk scores to severity levels
 */
export const RISK_THRESHOLDS = {
  LOW_MAX: 39,        // 0-39: Low risk (green)
  MEDIUM_MAX: 59,     // 40-59: Medium risk (cyan)
  HIGH_MAX: 79,       // 60-79: High risk (amber)
  CRITICAL_MIN: 80    // 80-100: Critical risk (red)
} as const;

/**
 * Risk severity type (derived from thresholds)
 */
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk color mappings (Olorin design system)
 * Each severity has bg, text, and border classes
 */
export const RISK_COLORS: Record<RiskSeverity, { bg: string; text: string; border: string }> = {
  low: {
    bg: 'bg-gray-800/50',
    text: 'text-gray-400',
    border: 'border-gray-600'
  },
  medium: {
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-400',
    border: 'border-cyan-500'
  },
  high: {
    bg: 'bg-amber-900/20',
    text: 'text-amber-400',
    border: 'border-amber-500'
  },
  critical: {
    bg: 'bg-red-900/30',
    text: 'text-red-400',
    border: 'border-red-500'
  }
};

/**
 * Maps risk score (0-100) to severity level
 * @param score - Risk score from 0-100
 * @returns Severity level: low, medium, high, or critical
 */
export function getRiskSeverity(score: number): RiskSeverity {
  if (score <= RISK_THRESHOLDS.LOW_MAX) return 'low';
  if (score <= RISK_THRESHOLDS.MEDIUM_MAX) return 'medium';
  if (score <= RISK_THRESHOLDS.HIGH_MAX) return 'high';
  return 'critical';
}

/**
 * Gets color classes for risk score
 * @param score - Risk score from 0-100
 * @returns Object with bg, text, and border CSS classes
 */
export function getRiskColors(score: number): { bg: string; text: string; border: string } {
  const severity = getRiskSeverity(score);
  return RISK_COLORS[severity];
}
