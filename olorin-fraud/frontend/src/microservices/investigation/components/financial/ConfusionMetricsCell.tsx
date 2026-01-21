/**
 * ConfusionMetricsCell Component
 * Feature: 025-financial-analysis-frontend
 *
 * Displays TP/FP counts in a compact table cell format.
 */

import React from 'react';
import type { ConfusionMetrics } from '../../types/financialMetrics';

interface ConfusionMetricsCellProps {
  metrics: ConfusionMetrics | null;
  className?: string;
}

export const ConfusionMetricsCell: React.FC<ConfusionMetricsCellProps> = ({ metrics, className = '' }) => {
  if (!metrics) {
    return <span className={`text-corporate-textTertiary ${className}`}>--</span>;
  }

  const { truePositives, falsePositives } = metrics;
  const total = truePositives + falsePositives;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-green-500 font-medium" title="True Positives">
          {truePositives}
        </span>
        <span className="text-corporate-textTertiary">/</span>
        <span className="text-red-500 font-medium" title="False Positives">
          {falsePositives}
        </span>
      </div>
      <span className="text-[10px] text-corporate-textTertiary">
        TP / FP ({total} total)
      </span>
    </div>
  );
};
