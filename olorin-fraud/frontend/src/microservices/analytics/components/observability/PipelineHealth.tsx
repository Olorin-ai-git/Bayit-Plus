/**
 * Pipeline Health Component - Display overall pipeline health status.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { FreshnessMonitor } from './FreshnessMonitor';
import { CompletenessMonitor } from './CompletenessMonitor';

const PipelineHealth: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealth = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getPipelineHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load pipeline health'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !health) {
    return <LoadingState message="Loading pipeline health..." />;
  }

  if (error && !health) {
    return (
      <div className="p-6 rounded-xl bg-corporate-error/20 border border-corporate-error">
        <p className="text-corporate-error">Error loading pipeline health: {error.message}</p>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-corporate-success text-white';
      case 'degraded':
        return 'bg-corporate-warning text-white';
      case 'unhealthy':
        return 'bg-corporate-error text-white';
      default:
        return 'bg-corporate-textSecondary text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-corporate-textPrimary">Pipeline Health</h2>
        <span
          className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(
            health.overallStatus || 'unknown'
          )}`}
        >
          {health.overallStatus?.toUpperCase() || 'UNKNOWN'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
          <div className="text-sm text-corporate-textSecondary mb-2">Freshness SLO</div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs px-2 py-1 rounded ${
                health.sloStatus?.freshnessMet
                  ? 'bg-corporate-success/20 text-corporate-success'
                  : 'bg-corporate-error/20 text-corporate-error'
              }`}
            >
              {health.sloStatus?.freshnessMet ? '✓ Met' : '✗ Violated'}
            </span>
            <span className="text-lg font-semibold text-corporate-textPrimary">
              {health.freshness?.ageMinutes?.toFixed(1) || 0} min
            </span>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
          <div className="text-sm text-corporate-textSecondary mb-2">Completeness SLO</div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs px-2 py-1 rounded ${
                health.sloStatus?.completenessMet
                  ? 'bg-corporate-success/20 text-corporate-success'
                  : 'bg-corporate-error/20 text-corporate-error'
              }`}
            >
              {health.sloStatus?.completenessMet ? '✓ Met' : '✗ Violated'}
            </span>
            <span className="text-lg font-semibold text-corporate-textPrimary">
              {((health.completeness?.completeness || 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
          <div className="text-sm text-corporate-textSecondary mb-2">Success Rate SLO</div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs px-2 py-1 rounded ${
                health.sloStatus?.successRateMet
                  ? 'bg-corporate-success/20 text-corporate-success'
                  : 'bg-corporate-error/20 text-corporate-error'
              }`}
            >
              {health.sloStatus?.successRateMet ? '✓ Met' : '✗ Violated'}
            </span>
            <span className="text-lg font-semibold text-corporate-textPrimary">
              {((health.successRate?.successRate || 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <FreshnessMonitor />
      <CompletenessMonitor />
    </div>
  );
};

export default PipelineHealth;

