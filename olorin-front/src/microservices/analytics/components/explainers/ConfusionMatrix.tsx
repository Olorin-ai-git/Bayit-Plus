/**
 * Confusion Matrix Component - Display confusion matrix over time.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';

interface ConfusionMatrixProps {
  startDate: string;
  endDate: string;
  timeBucket?: 'hour' | 'day' | 'week';
}

const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({
  startDate,
  endDate,
  timeBucket = 'day',
}) => {
  const [matrixData, setMatrixData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadMatrix();
  }, [startDate, endDate, timeBucket]);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getConfusionMatrix(startDate, endDate, timeBucket);
      setMatrixData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load confusion matrix'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading confusion matrix..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Confusion Matrix"
        message={error.message}
        actionLabel="Retry"
        onAction={loadMatrix}
      />
    );
  }

  if (!matrixData || !matrixData.overall) {
    return (
      <EmptyState
        title="No Data Available"
        message="Confusion matrix data could not be calculated for this time period."
      />
    );
  }

  const overall = matrixData.overall;
  const total = overall.truePositives + overall.falsePositives + overall.falseNegatives + overall.trueNegatives;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-corporate-textPrimary mb-2">Confusion Matrix</h2>
        <p className="text-corporate-textSecondary">
          Classification performance over time ({timeBucket} buckets)
        </p>
      </div>

      <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
        <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Overall Matrix</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-corporate-textSecondary">Predicted Fraud</div>
            <div className="p-4 rounded-lg bg-corporate-bgTertiary border border-corporate-border">
              <div className="text-xs text-corporate-textSecondary mb-1">True Positive</div>
              <div className="text-2xl font-bold text-corporate-success">
                {overall.truePositives?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-corporate-textSecondary mt-1">
                {total > 0 ? ((overall.truePositives / total) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="p-4 rounded-lg bg-corporate-bgTertiary border border-corporate-border">
              <div className="text-xs text-corporate-textSecondary mb-1">False Positive</div>
              <div className="text-2xl font-bold text-corporate-error">
                {overall.falsePositives?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-corporate-textSecondary mt-1">
                {total > 0 ? ((overall.falsePositives / total) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-corporate-textSecondary">Predicted Legitimate</div>
            <div className="p-4 rounded-lg bg-corporate-bgTertiary border border-corporate-border">
              <div className="text-xs text-corporate-textSecondary mb-1">False Negative</div>
              <div className="text-2xl font-bold text-corporate-warning">
                {overall.falseNegatives?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-corporate-textSecondary mt-1">
                {total > 0 ? ((overall.falseNegatives / total) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="p-4 rounded-lg bg-corporate-bgTertiary border border-corporate-border">
              <div className="text-xs text-corporate-textSecondary mb-1">True Negative</div>
              <div className="text-2xl font-bold text-corporate-success">
                {overall.trueNegatives?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-corporate-textSecondary mt-1">
                {total > 0 ? ((overall.trueNegatives / total) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {matrixData.overTime && matrixData.overTime.length > 0 && (
        <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Over Time</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-corporate-border">
                  <th className="text-left py-2 text-corporate-textSecondary">Time</th>
                  <th className="text-right py-2 text-corporate-textSecondary">TP</th>
                  <th className="text-right py-2 text-corporate-textSecondary">FP</th>
                  <th className="text-right py-2 text-corporate-textSecondary">FN</th>
                  <th className="text-right py-2 text-corporate-textSecondary">TN</th>
                  <th className="text-right py-2 text-corporate-textSecondary">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrixData.overTime.map((entry: any, index: number) => (
                  <tr key={index} className="border-b border-corporate-border">
                    <td className="py-2 text-corporate-textPrimary">
                      {entry.timestamp
                        ? new Date(entry.timestamp).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="text-right py-2 text-corporate-success">
                      {entry.truePositives?.toLocaleString() || 0}
                    </td>
                    <td className="text-right py-2 text-corporate-error">
                      {entry.falsePositives?.toLocaleString() || 0}
                    </td>
                    <td className="text-right py-2 text-corporate-warning">
                      {entry.falseNegatives?.toLocaleString() || 0}
                    </td>
                    <td className="text-right py-2 text-corporate-success">
                      {entry.trueNegatives?.toLocaleString() || 0}
                    </td>
                    <td className="text-right py-2 text-corporate-textPrimary font-medium">
                      {entry.total?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfusionMatrix;

