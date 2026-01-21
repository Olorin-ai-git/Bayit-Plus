/**
 * Investigation Risk Utilities
 *
 * Utility functions for risk score calculation and styling.
 * Extracted from InvestigationDetailsModal for code organization.
 */

import { Investigation } from '../../types/investigations';

/**
 * Formats date string to readable date/time string
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
};

/**
 * Calculate overall risk score from domain scores if overall_risk_score is not available
 */
export const calculateOverallRiskScore = (investigation: Investigation): number | null => {
  if (investigation.overall_risk_score !== null && investigation.overall_risk_score !== undefined) {
    return investigation.overall_risk_score > 1
      ? investigation.overall_risk_score
      : investigation.overall_risk_score * 100;
  }

  const domainScores: number[] = [];

  if (investigation.device_risk_score !== null && investigation.device_risk_score !== undefined) {
    domainScores.push(investigation.device_risk_score > 1 ? investigation.device_risk_score : investigation.device_risk_score * 100);
  }
  if (investigation.location_risk_score !== null && investigation.location_risk_score !== undefined) {
    domainScores.push(investigation.location_risk_score > 1 ? investigation.location_risk_score : investigation.location_risk_score * 100);
  }
  if (investigation.network_risk_score !== null && investigation.network_risk_score !== undefined) {
    domainScores.push(investigation.network_risk_score > 1 ? investigation.network_risk_score : investigation.network_risk_score * 100);
  }
  if (investigation.logs_risk_score !== null && investigation.logs_risk_score !== undefined) {
    domainScores.push(investigation.logs_risk_score > 1 ? investigation.logs_risk_score : investigation.logs_risk_score * 100);
  }

  if (domainScores.length > 0) {
    return domainScores.reduce((sum, score) => sum + score, 0) / domainScores.length;
  }

  return null;
};

/**
 * Get risk severity level from score (0-100)
 */
export const getRiskSeverity = (score: number | null | undefined): 'no-risk' | 'low' | 'medium' | 'high' => {
  if (score === null || score === undefined || score === 0) return 'no-risk';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

/**
 * Gets risk level badge styling and color based on severity
 */
export const getRiskBadgeStyles = (severity: 'no-risk' | 'low' | 'medium' | 'high') => {
  switch (severity) {
    case 'high':
      return {
        styles: 'bg-red-900/30 border-red-500 text-red-300',
        color: '#ef4444',
      };
    case 'medium':
      return {
        styles: 'bg-orange-900/30 border-orange-500 text-orange-300',
        color: '#f97316',
      };
    case 'low':
      return {
        styles: 'bg-yellow-900/30 border-yellow-500 text-yellow-300',
        color: '#eab308',
      };
    case 'no-risk':
    default:
      return {
        styles: 'bg-green-900/30 border-green-500 text-green-300',
        color: '#22c55e',
      };
  }
};
