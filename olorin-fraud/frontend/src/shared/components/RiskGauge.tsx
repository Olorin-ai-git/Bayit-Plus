/**
 * RiskGauge Component
 * Feature: 004-new-olorin-frontend
 *
 * Visual risk score display with gradient colors.
 * Shows risk level from 0-100 with color-coded gauge.
 */

import React from 'react';
import { RiskLevel } from '@shared/types/wizard.types';
import { getRiskColorsByScore } from '@shared/styles/olorin-palette';
import { calculateRiskLevel } from '@shared/types/wizard.types';

export interface RiskGaugeProps {
  /** Risk score (0-100) */
  score: number;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show numeric score */
  showScore?: boolean;
  /** Show risk level label */
  showLabel?: boolean;
}

/**
 * RiskGauge component with color-coded visualization
 */
export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  size = 'md',
  showScore = true,
  showLabel = true
}) => {
  const riskLevel = calculateRiskLevel(score);
  const riskColors = getRiskColorsByScore(score);

  const sizeClasses = {
    sm: { gauge: 'w-24 h-24', text: 'text-2xl', label: 'text-xs' },
    md: { gauge: 'w-32 h-32', text: 'text-3xl', label: 'text-sm' },
    lg: { gauge: 'w-40 h-40', text: 'text-4xl', label: 'text-base' }
  };

  const sizes = sizeClasses[size];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getRiskLevelLabel = (level: RiskLevel): string => {
    const labels: Record<RiskLevel, string> = {
      [RiskLevel.CRITICAL]: 'Critical',
      [RiskLevel.HIGH]: 'High',
      [RiskLevel.MEDIUM]: 'Medium',
      [RiskLevel.LOW]: 'Low'
    };
    return labels[level];
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative ${sizes.gauge}`}>
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-corporate-borderPrimary"
          />

          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke={riskColors.hex}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {showScore && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`${sizes.text} font-bold ${riskColors.text}`}>
              {Math.round(score)}
            </span>
          </div>
        )}
      </div>

      {showLabel && (
        <div className="flex flex-col items-center gap-1">
          <span className={`${sizes.label} font-semibold ${riskColors.text}`}>
            {getRiskLevelLabel(riskLevel)}
          </span>
          <span className={`${sizes.label} text-corporate-textTertiary`}>
            Risk Level
          </span>
        </div>
      )}
    </div>
  );
};
