/**
 * Drift Monitor Component - Monitor data drift across features.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { PSIChart } from './PSIChart';
import { DataQuality } from './DataQuality';

interface DriftMonitorProps {
  features?: string[];
}

const DriftMonitor: React.FC<DriftMonitorProps> = ({ features = ['MODEL_SCORE', 'AMOUNT', 'EMAIL'] }) => {
  const [driftResults, setDriftResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadDriftData();
    const interval = setInterval(loadDriftData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDriftData = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const currentStart = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const referenceEnd = currentStart;
      const referenceStart = new Date(referenceEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

      const results = await Promise.all(
        features.map((feature) =>
          analyticsService.detectDrift(
            feature,
            referenceStart.toISOString(),
            referenceEnd.toISOString(),
            currentStart.toISOString(),
            endDate.toISOString()
          )
        )
      );

      setDriftResults(results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load drift data'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && driftResults.length === 0) {
    return <LoadingState message="Loading drift data..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Drift Data"
        message={error.message}
        actionLabel="Retry"
        onAction={loadDriftData}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-corporate-textPrimary">Drift Monitoring</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {driftResults.map((result) => (
          <div
            key={result.feature}
            className={`p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border ${
              result.driftDetected
                ? 'border-corporate-error'
                : 'border-corporate-border'
            }`}
          >
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">
              {result.feature}
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-corporate-textSecondary">PSI:</span>{' '}
                <span
                  className={`font-medium ${
                    result.psi > result.psiThreshold
                      ? 'text-corporate-error'
                      : 'text-corporate-textPrimary'
                  }`}
                >
                  {result.psi.toFixed(4)}
                </span>
                <span className="text-corporate-textSecondary text-xs ml-2">
                  (threshold: {result.psiThreshold})
                </span>
              </div>
              <div>
                <span className="text-corporate-textSecondary">KL Divergence:</span>{' '}
                <span
                  className={`font-medium ${
                    result.klDivergence > result.klThreshold
                      ? 'text-corporate-error'
                      : 'text-corporate-textPrimary'
                  }`}
                >
                  {result.klDivergence.toFixed(4)}
                </span>
              </div>
              {result.driftDetected && (
                <div className="mt-2 px-2 py-1 rounded bg-corporate-error/20 text-corporate-error text-xs">
                  ⚠ Drift Detected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {driftResults.length > 0 && <PSIChart driftResults={driftResults} />}
      <DataQuality />
    </div>
  );
};

export default DriftMonitor;

