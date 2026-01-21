/**
 * Fraud Detection Utilities for ResponseAnalyzer
 * Pattern detection, risk calculation, and recommendation generation for fraud analysis
 */

import type { FraudIndicators, RiskLevel } from './types';

/**
 * Detect fraud patterns in text
 * Searches for common fraud indicators and assigns confidence/severity
 *
 * NOTE (Phase 1.2): This contains pattern-based logic that should be replaced with
 * real fraud detection API calls in Phase 1.2 (mock data removal)
 */
export function detectFraudPatterns(
  text: string
): FraudIndicators['indicators'] {
  const indicators: FraudIndicators['indicators'] = [];
  const lowerText = text.toLowerCase();

  // Pattern detection logic
  if (lowerText.includes('multiple devices')) {
    indicators.push({
      type: 'device_anomaly',
      description: 'Multiple devices detected for single user',
      confidence: 0.8,
      severity: 'medium' as const,
    });
  }

  if (lowerText.includes('unusual location')) {
    indicators.push({
      type: 'location_anomaly',
      description: 'Access from unusual geographic location',
      confidence: 0.75,
      severity: 'high' as const,
    });
  }

  if (lowerText.includes('rapid transactions')) {
    indicators.push({
      type: 'velocity_anomaly',
      description: 'High transaction velocity detected',
      confidence: 0.9,
      severity: 'high' as const,
    });
  }

  return indicators;
}

/**
 * Calculate overall risk level from fraud indicators
 * Considers severity counts and average confidence
 */
export function calculateRiskLevel(
  indicators: FraudIndicators['indicators']
): RiskLevel {
  if (indicators.length === 0) return 'low';

  const highSeverityCount = indicators.filter(
    (i) => i.severity === 'high'
  ).length;
  const avgConfidence =
    indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length;

  if (highSeverityCount >= 2 || avgConfidence > 0.85) return 'critical';
  if (highSeverityCount >= 1 || avgConfidence > 0.7) return 'high';
  if (indicators.length >= 2 || avgConfidence > 0.5) return 'medium';
  return 'low';
}

/**
 * Generate recommendation based on risk level and indicators
 * Provides actionable guidance for fraud response
 */
export function generateRecommendation(
  riskLevel: RiskLevel,
  indicators: FraudIndicators['indicators']
): string {
  switch (riskLevel) {
    case 'critical':
      return 'Immediate escalation required. Block account and initiate full investigation.';
    case 'high':
      return 'Enhanced monitoring and verification required. Consider temporary restrictions.';
    case 'medium':
      return 'Continue monitoring and gather additional evidence. Implement enhanced authentication.';
    default:
      return 'Continue standard monitoring procedures. No immediate action required.';
  }
}

/**
 * Suggest next actions based on risk level and indicator types
 * Returns prioritized list of actions to take
 */
export function suggestNextActions(
  riskLevel: RiskLevel,
  indicators: FraudIndicators['indicators']
): string[] {
  const actions: string[] = [];

  switch (riskLevel) {
    case 'critical':
      actions.push('Escalate to fraud team immediately');
      actions.push('Block account pending investigation');
      actions.push('Notify compliance team');
      break;
    case 'high':
      actions.push('Implement enhanced authentication');
      actions.push('Request additional verification');
      actions.push('Monitor for 48 hours');
      break;
    case 'medium':
      actions.push('Continue standard monitoring');
      actions.push('Review transaction patterns');
      actions.push('Schedule follow-up review');
      break;
    default:
      actions.push('Continue routine monitoring');
      break;
  }

  // Add specific actions based on indicators
  indicators.forEach((indicator) => {
    switch (indicator.type) {
      case 'device_anomaly':
        actions.push('Verify device ownership');
        break;
      case 'location_anomaly':
        actions.push('Confirm location with user');
        break;
      case 'velocity_anomaly':
        actions.push('Review transaction velocity limits');
        break;
    }
  });

  return [...new Set(actions)]; // Remove duplicates
}
