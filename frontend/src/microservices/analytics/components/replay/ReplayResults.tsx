/**
 * Replay Results Component - Display replay execution results.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { formatPercentage, formatCurrency } from '../../utils/formatters';

interface ReplayResultsProps {
  scenarioId: string;
  onRun?: (scenarioId: string) => void;
}

const ReplayResults: React.FC<ReplayResultsProps> = ({ scenarioId, onRun }) => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadResults();
  }, [scenarioId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getReplayScenarioResults(scenarioId);
      setResults(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        setResults(null);
      } else {
        setError(err instanceof Error ? err : new Error('Failed to load results'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    try {
      setRunning(true);
      setError(null);
      await analyticsService.runReplayScenario(scenarioId);
      await loadResults();
      onRun?.(scenarioId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to run scenario'));
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading replay results..." />;
  }

  if (error && !results) {
    return (
      <EmptyState
        title="Error Loading Results"
        message={error.message}
        actionLabel="Retry"
        onAction={loadResults}
      />
    );
  }

  if (!results) {
    return (
      <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
        <div className="text-center py-8">
          <p className="text-corporate-textSecondary mb-4">No results available for this scenario.</p>
          <button
            onClick={handleRun}
            disabled={running}
            className="px-6 py-2 rounded-lg bg-corporate-accentPrimary text-white hover:bg-corporate-accentPrimary/90 disabled:opacity-50"
          >
            {running ? 'Running...' : 'Run Scenario'}
          </button>
        </div>
      </div>
    );
  }

  const replayResults = results.replayResults || results;
  const metrics = results.metrics || {};

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-corporate-textPrimary">Replay Results</h2>
        <button
          onClick={handleRun}
          disabled={running}
          className="px-4 py-2 rounded-lg bg-corporate-accentPrimary text-white hover:bg-corporate-accentPrimary/90 disabled:opacity-50 text-sm"
        >
          {running ? 'Running...' : 'Re-run'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <div className="text-sm text-corporate-textSecondary">Total Decisions</div>
          <div className="text-2xl font-bold text-corporate-textPrimary">
            {replayResults.totalDecisions?.toLocaleString() || 0}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary">Would Decline</div>
          <div className="text-2xl font-bold text-corporate-textPrimary">
            {replayResults.wouldDecline?.toLocaleString() || 0}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary">Would Approve</div>
          <div className="text-2xl font-bold text-corporate-textPrimary">
            {replayResults.wouldApprove?.toLocaleString() || 0}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary">Would Catch Fraud</div>
          <div className="text-2xl font-bold text-corporate-success">
            {replayResults.wouldCatchFraud?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-corporate-textSecondary">Precision</div>
          <div className="text-xl font-semibold text-corporate-textPrimary">
            {formatPercentage(metrics.precision || replayResults.precision || 0)}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary">Recall</div>
          <div className="text-xl font-semibold text-corporate-textPrimary">
            {formatPercentage(metrics.recall || replayResults.recall || 0)}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary">F1 Score</div>
          <div className="text-xl font-semibold text-corporate-textPrimary">
            {formatPercentage(metrics.f1Score || replayResults.f1Score || 0)}
          </div>
        </div>
      </div>

      {results.impactMetrics && (
        <div className="mt-6 pt-6 border-t border-corporate-border">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Impact Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-corporate-textSecondary">Cost Savings</div>
              <div className="text-xl font-semibold text-corporate-success">
                {formatCurrency(results.impactMetrics.costSavings || 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-corporate-textSecondary">False Positive Reduction</div>
              <div className="text-xl font-semibold text-corporate-success">
                {results.impactMetrics.falsePositiveReduction?.toLocaleString() || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReplayResults;

