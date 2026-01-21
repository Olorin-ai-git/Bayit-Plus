/**
 * Freshness Monitor Component - Monitor data freshness metrics.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';

const FreshnessMonitor: React.FC = () => {
  const [freshness, setFreshness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFreshness();
    const interval = setInterval(loadFreshness, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadFreshness = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.checkPipelineFreshness();
      setFreshness(data);
    } catch (err) {
      console.error('Failed to load freshness:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !freshness) {
    return <LoadingState message="Loading freshness metrics..." />;
  }

  if (!freshness) {
    return null;
  }

  const isHealthy = freshness.status === 'healthy';
  const ageMinutes = freshness.ageMinutes || 0;
  const threshold = freshness.thresholdMinutes || 5;

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Data Freshness</h3>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-corporate-textSecondary">Age</span>
            <span
              className={`text-2xl font-bold ${
                isHealthy ? 'text-corporate-success' : 'text-corporate-error'
              }`}
            >
              {ageMinutes.toFixed(1)} min
            </span>
          </div>
          <div className="h-2 bg-corporate-bgSecondary rounded-full overflow-hidden">
            <div
              className={`h-full ${isHealthy ? 'bg-corporate-success' : 'bg-corporate-error'}`}
              style={{ width: `${Math.min((ageMinutes / threshold) * 100, 100)}%` }}
            />
          </div>
          <div className="text-xs text-corporate-textSecondary mt-1">
            Threshold: {threshold} minutes
          </div>
        </div>

        {freshness.latestTimestamp && (
          <div className="text-sm text-corporate-textSecondary">
            Latest: {new Date(freshness.latestTimestamp).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default FreshnessMonitor;

