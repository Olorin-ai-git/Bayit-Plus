/**
 * KPI Tiles Component - Display key performance indicators.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { formatPercentage, formatCurrency, formatThroughput } from '../../utils/formatters';
import type { DashboardKPIs } from '../../types/analytics';

interface KPITilesProps {
  kpis: DashboardKPIs;
}

const KPITiles: React.FC<KPITilesProps> = ({ kpis }) => {
  const tiles = [
    {
      label: 'Precision',
      value: formatPercentage(kpis.precision),
      description: 'True positives / (True positives + False positives)',
      color: 'text-corporate-success',
    },
    {
      label: 'Recall',
      value: formatPercentage(kpis.recall),
      description: 'True positives / (True positives + False negatives)',
      color: 'text-corporate-info',
    },
    {
      label: 'F1 Score',
      value: formatPercentage(kpis.f1Score),
      description: 'Harmonic mean of precision and recall',
      color: 'text-corporate-accentPrimary',
    },
    {
      label: 'Capture Rate',
      value: formatPercentage(kpis.captureRate),
      description: 'Percentage of fraud cases detected',
      color: 'text-corporate-warning',
    },
    {
      label: 'Approval Rate',
      value: formatPercentage(kpis.approvalRate),
      description: 'Percentage of transactions approved',
      color: 'text-corporate-success',
    },
    {
      label: 'False Positive Cost',
      value: formatCurrency(kpis.falsePositiveCost),
      description: 'Total cost of false positive decisions',
      color: 'text-corporate-error',
    },
    {
      label: 'Chargeback Rate',
      value: formatPercentage(kpis.chargebackRate),
      description: 'Chargebacks / Approved transactions',
      color: 'text-corporate-error',
    },
    {
      label: 'Decision Throughput',
      value: formatThroughput(kpis.decisionThroughput),
      description: 'Decisions processed per minute',
      color: 'text-corporate-info',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map((tile, index) => (
        <div
          key={index}
          className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6 hover:border-corporate-accentPrimary/50 transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-medium text-corporate-textSecondary">
              {tile.label}
            </h3>
          </div>
          <div className={`text-2xl font-bold ${tile.color} mb-1`}>
            {tile.value}
          </div>
          <p className="text-xs text-corporate-textTertiary mt-2">
            {tile.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default KPITiles;

