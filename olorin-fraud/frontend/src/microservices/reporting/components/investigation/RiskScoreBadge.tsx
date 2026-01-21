/**
 * RiskScoreBadge Component
 * Feature: 001-extensive-investigation-report
 * Task: T066
 *
 * Displays risk score with color-coded badge based on risk level thresholds.
 * Risk levels:
 * - critical: 80-100 (red)
 * - high: 60-79 (orange/amber)
 * - medium: 40-59 (cyan)
 * - low: 0-39 (gray)
 */

import React from 'react';
import type { RiskLevel } from '../../types/reports';

interface RiskScoreBadgeProps {
  score: number | null;
  className?: string;
}

/**
 * Determines risk level based on score thresholds.
 */
function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Returns Tailwind classes for risk level color coding.
 */
function getRiskLevelStyles(level: RiskLevel): {
  bg: string;
  text: string;
  border: string;
} {
  const styles = {
    critical: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-400',
      border: 'border-red-300 dark:border-red-500'
    },
    high: {
      bg: 'bg-amber-100 dark:bg-amber-900/20',
      text: 'text-amber-800 dark:text-amber-400',
      border: 'border-amber-300 dark:border-amber-500'
    },
    medium: {
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      text: 'text-cyan-800 dark:text-cyan-400',
      border: 'border-cyan-300 dark:border-cyan-500'
    },
    low: {
      bg: 'bg-gray-100 dark:bg-gray-800/50',
      text: 'text-gray-800 dark:text-gray-400',
      border: 'border-gray-300 dark:border-gray-600'
    }
  };
  return styles[level];
}

/**
 * Returns display label for risk level.
 */
function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    critical: 'Critical Risk',
    high: 'High Risk',
    medium: 'Medium Risk',
    low: 'Low Risk'
  };
  return labels[level];
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({ score, className = '' }) => {
  if (score === null || score === undefined) {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 ${className}`}
        aria-label="Risk score unknown"
      >
        Unknown
      </span>
    );
  }

  const level = getRiskLevel(score);
  const styles = getRiskLevelStyles(level);
  const label = getRiskLevelLabel(level);

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles.bg} ${styles.text} ${styles.border} ${className}`}
      aria-label={`${label}: ${score.toFixed(1)}`}
      title={`Risk Score: ${score.toFixed(1)}/100`}
    >
      <span className="font-bold">{score.toFixed(1)}</span>
      <span className="mx-1">/</span>
      <span className="text-xs">100</span>
    </span>
  );
};

export default RiskScoreBadge;
