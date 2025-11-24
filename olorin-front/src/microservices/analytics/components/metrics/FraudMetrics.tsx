/**
 * Fraud Metrics Component - Display fraud detection metrics.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import PrecisionRecall from './PrecisionRecall';
import LatencyMetrics from './LatencyMetrics';
import ThroughputMetrics from './ThroughputMetrics';
import { formatPercentage, formatCurrency } from '../../utils/formatters';

const FraudMetrics: React.FC = () => {
  const { data, loading, error } = useAnalytics();

  if (loading) {
    return <LoadingState message="Loading fraud metrics..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Metrics"
        message={error.message}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No Metrics Available"
        message="No fraud metrics found for the selected time period."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">
          Fraud Detection Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-corporate-textSecondary mb-1">Precision</div>
            <div className="text-2xl font-bold text-corporate-success">
              {formatPercentage(data.kpis.precision)}
            </div>
          </div>
          <div>
            <div className="text-sm text-corporate-textSecondary mb-1">Recall</div>
            <div className="text-2xl font-bold text-corporate-info">
              {formatPercentage(data.kpis.recall)}
            </div>
          </div>
          <div>
            <div className="text-sm text-corporate-textSecondary mb-1">F1 Score</div>
            <div className="text-2xl font-bold text-corporate-accentPrimary">
              {formatPercentage(data.kpis.f1Score)}
            </div>
          </div>
        </div>
      </div>

      <PrecisionRecall />
      <LatencyMetrics />
      <ThroughputMetrics />
    </div>
  );
};

export default FraudMetrics;

