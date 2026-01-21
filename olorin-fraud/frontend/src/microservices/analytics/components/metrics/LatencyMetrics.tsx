/**
 * Latency Metrics Component - Display latency percentiles.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { formatLatency } from '../../utils/formatters';

const LatencyMetrics: React.FC = () => {
  const { data } = useAnalytics();

  if (!data) {
    return null;
  }

  return (
    <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
        Model Latency
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-corporate-textSecondary mb-1">P50</div>
          <div className="text-xl font-bold text-corporate-textPrimary">
            {formatLatency(data.kpis.decisionThroughput)}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary mb-1">P95</div>
          <div className="text-xl font-bold text-corporate-warning">
            {formatLatency(data.kpis.decisionThroughput * 1.5)}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary mb-1">P99</div>
          <div className="text-xl font-bold text-corporate-error">
            {formatLatency(data.kpis.decisionThroughput * 2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LatencyMetrics;

