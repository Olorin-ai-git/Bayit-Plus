/**
 * FinancialOverview Component
 * Feature: 025-financial-analysis-frontend
 *
 * Displays KPI cards for aggregated financial metrics.
 */

import React from 'react';
import { Card } from '@shared/components/ui/Card';
import { CurrencyDisplay } from '../../../investigation/components/financial/CurrencyDisplay';
import { getNetValueColorClass } from '../../../investigation/utils/currencyFormatter';
import type { FinancialSummary } from '../../../investigation/types/financialMetrics';

interface FinancialOverviewProps {
  summary: FinancialSummary;
  className?: string;
}

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({ summary, className = '' }) => {
  const kpis = [
    {
      label: 'Total Saved GMV',
      value: summary.totalSavedFraudGmv,
      colorClass: 'text-green-400',
      subtext: 'Fraud prevented',
    },
    {
      label: 'Total Lost Revenue',
      value: summary.totalLostRevenues,
      colorClass: 'text-red-400',
      subtext: 'False positive impact',
    },
    {
      label: 'Net Value',
      value: summary.totalNetValue,
      colorClass: getNetValueColorClass(summary.totalNetValue),
      subtext: 'Overall impact',
    },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="text-center py-6">
          <div className="text-xs uppercase tracking-wider text-corporate-textTertiary mb-2">
            {kpi.label}
          </div>
          <div className={`text-3xl font-bold ${kpi.colorClass}`}>
            <CurrencyDisplay value={kpi.value} format="compact" />
          </div>
          <div className="text-sm text-corporate-textSecondary mt-1">{kpi.subtext}</div>
        </Card>
      ))}
    </div>
  );
};
