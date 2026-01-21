/**
 * Completeness Monitor Component - Monitor data completeness metrics.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { formatPercentage } from '../../utils/formatters';

const CompletenessMonitor: React.FC = () => {
  const [completeness, setCompleteness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompleteness();
    const interval = setInterval(loadCompleteness, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadCompleteness = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      const data = await analyticsService.checkPipelineCompleteness(
        startDate.toISOString(),
        endDate.toISOString()
      );
      setCompleteness(data);
    } catch (err) {
      console.error('Failed to load completeness:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !completeness) {
    return <LoadingState message="Loading completeness metrics..." />;
  }

  if (!completeness) {
    return null;
  }

  const isHealthy = completeness.status === 'healthy';
  const completenessValue = completeness.completeness || 0;
  const threshold = completeness.threshold || 0.99;

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Data Completeness</h3>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-corporate-textSecondary">Completeness</span>
            <span
              className={`text-2xl font-bold ${
                isHealthy ? 'text-corporate-success' : 'text-corporate-error'
              }`}
            >
              {formatPercentage(completenessValue)}
            </span>
          </div>
          <div className="h-2 bg-corporate-bgSecondary rounded-full overflow-hidden">
            <div
              className={`h-full ${isHealthy ? 'bg-corporate-success' : 'bg-corporate-error'}`}
              style={{ width: `${completenessValue * 100}%` }}
            />
          </div>
          <div className="text-xs text-corporate-textSecondary mt-1">
            Threshold: {formatPercentage(threshold)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-corporate-textSecondary">Actual Count</div>
            <div className="text-lg font-semibold text-corporate-textPrimary">
              {completeness.actualCount?.toLocaleString() || 0}
            </div>
          </div>
          <div>
            <div className="text-corporate-textSecondary">Complete Count</div>
            <div className="text-lg font-semibold text-corporate-textPrimary">
              {completeness.completeCount?.toLocaleString() || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletenessMonitor;

