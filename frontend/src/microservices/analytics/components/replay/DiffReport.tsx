/**
 * Diff Report Component - Compare replay results with production.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { formatPercentage } from '../../utils/formatters';

interface DiffReportProps {
  scenarioId: string;
}

const DiffReport: React.FC<DiffReportProps> = ({ scenarioId }) => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [scenarioId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getReplayScenarioResults(scenarioId);
      setResults(data);
    } catch (err) {
      console.error('Failed to load diff report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading comparison..." />;
  }

  if (!results || !results.productionComparison) {
    return null;
  }

  const diff = results.productionComparison;

  const getDiffColor = (value: number) => {
    if (value > 0) return 'text-corporate-success';
    if (value < 0) return 'text-corporate-error';
    return 'text-corporate-textPrimary';
  };

  const getDiffIcon = (value: number) => {
    if (value > 0) return '↑';
    if (value < 0) return '↓';
    return '→';
  };

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">
        Comparison vs Production
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-corporate-bgTertiary">
          <div className="text-sm text-corporate-textSecondary mb-1">Precision</div>
          <div className={`text-lg font-semibold ${getDiffColor(diff.precisionDiff || 0)}`}>
            {getDiffIcon(diff.precisionDiff || 0)}{' '}
            {formatPercentage(Math.abs(diff.precisionDiff || 0))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-corporate-bgTertiary">
          <div className="text-sm text-corporate-textSecondary mb-1">Recall</div>
          <div className={`text-lg font-semibold ${getDiffColor(diff.recallDiff || 0)}`}>
            {getDiffIcon(diff.recallDiff || 0)}{' '}
            {formatPercentage(Math.abs(diff.recallDiff || 0))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-corporate-bgTertiary">
          <div className="text-sm text-corporate-textSecondary mb-1">F1 Score</div>
          <div className={`text-lg font-semibold ${getDiffColor(diff.f1ScoreDiff || 0)}`}>
            {getDiffIcon(diff.f1ScoreDiff || 0)}{' '}
            {formatPercentage(Math.abs(diff.f1ScoreDiff || 0))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-corporate-bgTertiary">
          <div className="text-sm text-corporate-textSecondary mb-1">False Positives</div>
          <div className={`text-lg font-semibold ${getDiffColor(-(diff.falsePositiveDiff || 0))}`}>
            {getDiffIcon(-(diff.falsePositiveDiff || 0))}{' '}
            {Math.abs(diff.falsePositiveDiff || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-corporate-bgTertiary">
          <div className="text-sm text-corporate-textSecondary mb-1">True Positives</div>
          <div className={`text-lg font-semibold ${getDiffColor(diff.truePositiveDiff || 0)}`}>
            {getDiffIcon(diff.truePositiveDiff || 0)}{' '}
            {Math.abs(diff.truePositiveDiff || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-corporate-bgTertiary">
          <div className="text-sm text-corporate-textSecondary mb-1">Decline Rate</div>
          <div className={`text-lg font-semibold ${getDiffColor(diff.declineRateDiff || 0)}`}>
            {getDiffIcon(diff.declineRateDiff || 0)}{' '}
            {formatPercentage(Math.abs(diff.declineRateDiff || 0))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffReport;

