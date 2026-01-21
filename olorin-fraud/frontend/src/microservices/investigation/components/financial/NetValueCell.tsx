/**
 * NetValueCell Component
 * Feature: 025-financial-analysis-frontend
 *
 * Table cell component for displaying net value with color coding.
 * Green for positive (profit), red for negative (loss), gray for zero.
 */

import React from 'react';
import { Badge } from '@shared/components/ui/Badge';
import {
  formatCurrency,
  getNetValueColorClass,
  getConfidenceColorClass,
} from '../../utils/currencyFormatter';
import type { ConfidenceLevel } from '../../types/financialMetrics';

interface NetValueCellProps {
  /** Net value amount (can be negative) */
  netValue: number;
  /** Confidence level for the calculation */
  confidenceLevel?: ConfidenceLevel;
  /** Whether calculation was skipped due to prediction validation */
  skipped?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const NetValueCell: React.FC<NetValueCellProps> = ({
  netValue,
  confidenceLevel,
  skipped = false,
  className = '',
}) => {
  if (skipped) {
    return (
      <div className={`flex flex-col items-end gap-1 ${className}`}>
        <span className="text-corporate-textTertiary text-sm">N/A</span>
        <Badge variant="warning" size="sm">
          Skipped
        </Badge>
      </div>
    );
  }

  const colorClass = getNetValueColorClass(netValue);
  const formattedValue = formatCurrency(netValue);
  const displayValue = netValue > 0 ? `+${formattedValue}` : formattedValue;
  const indicator = netValue > 0 ? '▲' : netValue < 0 ? '▼' : '—';

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <span
        className={`font-semibold tabular-nums ${colorClass}`}
        aria-label={`Net value: ${displayValue}`}
      >
        {indicator} {displayValue}
      </span>
      {confidenceLevel && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColorClass(confidenceLevel)}`}
          aria-label={`Confidence level: ${confidenceLevel}`}
        >
          {confidenceLevel}
        </span>
      )}
    </div>
  );
};
