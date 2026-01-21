/**
 * FinancialSummaryPanel Component
 * Feature: 025-financial-analysis-frontend
 *
 * Displays aggregated financial metrics summary above the investigations table.
 * Shows total saved GMV, lost revenues, net value, and investigation counts.
 */

import React from 'react';
import { Card } from '@shared/components/ui/Card';
import { CurrencyDisplay } from './CurrencyDisplay';
import { getNetValueColorClass } from '../../utils/currencyFormatter';
import type { FinancialSummary } from '../../types/financialMetrics';

interface FinancialSummaryPanelProps {
  /** Aggregated financial summary data */
  summary: FinancialSummary | null;
  /** Loading state */
  loading?: boolean;
  /** Error message if fetch failed */
  error?: string | null;
  /** Additional CSS classes */
  className?: string;
}

export const FinancialSummaryPanel: React.FC<FinancialSummaryPanelProps> = ({
  summary,
  loading = false,
  error = null,
  className = '',
}) => {
  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-corporate-bgTertiary rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-red-500/40 ${className}`}>
        <div className="text-red-400 text-sm">{error}</div>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const metrics = [
    {
      label: 'Total Saved GMV',
      value: summary.totalSavedFraudGmv,
      colorClass: 'text-green-400',
    },
    {
      label: 'Total Lost Revenue',
      value: summary.totalLostRevenues,
      colorClass: 'text-red-400',
    },
    {
      label: 'Net Value',
      value: summary.totalNetValue,
      colorClass: getNetValueColorClass(summary.totalNetValue),
    },
  ];

  return (
    <Card className={className}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <div className={`text-2xl font-bold ${metric.colorClass}`}>
              <CurrencyDisplay value={metric.value} format="compact" />
            </div>
            <div className="text-xs text-corporate-textTertiary mt-1">
              {metric.label}
            </div>
          </div>
        ))}
        <div className="text-center">
          <div className="text-2xl font-bold text-corporate-textPrimary">
            {summary.successfulCalculations}/{summary.investigationCount}
          </div>
          <div className="text-xs text-corporate-textTertiary mt-1">
            Investigations
          </div>
        </div>
      </div>
      {summary.aggregateConfusionMatrix && (
        <div className="mt-4 pt-4 border-t border-corporate-borderPrimary">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <span className="text-corporate-textSecondary">
              Avg Precision:{' '}
              <span className="text-corporate-textPrimary font-medium">
                {(summary.aggregateConfusionMatrix.avgPrecision * 100).toFixed(1)}%
              </span>
            </span>
            <span className="text-corporate-textSecondary">
              Avg Recall:{' '}
              <span className="text-corporate-textPrimary font-medium">
                {(summary.aggregateConfusionMatrix.avgRecall * 100).toFixed(1)}%
              </span>
            </span>
            <span className="text-corporate-textSecondary">
              Total TP/FP:{' '}
              <span className="text-green-400 font-medium">
                {summary.aggregateConfusionMatrix.totalTP}
              </span>
              /
              <span className="text-red-400 font-medium">
                {summary.aggregateConfusionMatrix.totalFP}
              </span>
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};
