/**
 * KPI Cards Component
 *
 * Displays key performance indicators for a window:
 * total_transactions, over_threshold, TP, FP, TN, FN.
 * Includes basic confusion matrix values.
 *
 * Constitutional Compliance:
 * - All values from API response (no hardcoded defaults)
 * - Handles zero values gracefully
 */

import React from 'react';
import { Card } from '@shared/components/ui/Card';
import type { WindowMetrics } from '../types/comparison';

interface KpiCardsProps {
  metrics: WindowMetrics;
  windowLabel: string;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics, windowLabel }) => {
  const kpis = [
    { label: 'Total Transactions', value: metrics.total_transactions, color: 'text-corporate-textPrimary' },
    { label: 'Over Threshold', value: metrics.over_threshold, color: 'text-yellow-400' },
    { label: 'True Positives', value: metrics.TP, color: 'text-green-400' },
    { label: 'False Positives', value: metrics.FP, color: 'text-red-400' },
    { label: 'True Negatives', value: metrics.TN, color: 'text-green-400' },
    { label: 'False Negatives', value: metrics.FN, color: 'text-red-400' }
  ];

  return (
    <div>
      <h3 className="text-sm font-medium text-corporate-textSecondary mb-3">
        {windowLabel} - Key Metrics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} variant="default" padding="sm" className="text-center">
            <div className={`text-2xl font-bold ${kpi.color}`}>
              {kpi.value.toLocaleString()}
            </div>
            <div className="text-xs text-corporate-textTertiary mt-1">
              {kpi.label}
            </div>
          </Card>
        ))}
      </div>
      {metrics.pending_label_count && metrics.pending_label_count > 0 && (
        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/40 rounded text-xs text-yellow-400">
          {metrics.pending_label_count} pending labels excluded from metrics
        </div>
      )}
    </div>
  );
};

