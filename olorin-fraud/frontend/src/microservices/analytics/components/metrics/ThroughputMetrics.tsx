/**
 * Throughput Metrics Component - Display decision throughput.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { formatThroughput } from '../../utils/formatters';

const ThroughputMetrics: React.FC = () => {
  const { data } = useAnalytics();

  if (!data) {
    return null;
  }

  return (
    <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
        Decision Throughput
      </h3>
      <div className="text-3xl font-bold text-corporate-accentPrimary">
        {formatThroughput(data.kpis.decisionThroughput)}
      </div>
      <p className="text-sm text-corporate-textSecondary mt-2">
        Decisions processed per minute
      </p>
    </div>
  );
};

export default ThroughputMetrics;

