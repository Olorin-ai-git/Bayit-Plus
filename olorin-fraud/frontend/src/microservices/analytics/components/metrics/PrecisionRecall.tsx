/**
 * Precision/Recall Component - Display precision and recall metrics.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { formatPercentage } from '../../utils/formatters';
import type { PrecisionRecallResponse } from '../../types/metrics';

const PrecisionRecall: React.FC = () => {
  const [data, setData] = useState<PrecisionRecallResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const result = await analyticsService.getPrecisionRecall(startDate, endDate);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch precision/recall'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading precision/recall metrics..." size="sm" />;
  }

  if (error || !data) {
    return null;
  }

  return (
    <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
        Precision & Recall
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-corporate-textSecondary mb-1">Precision</div>
          <div className="text-xl font-bold text-corporate-success">
            {formatPercentage(data.precision)}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary mb-1">Recall</div>
          <div className="text-xl font-bold text-corporate-info">
            {formatPercentage(data.recall)}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary mb-1">F1 Score</div>
          <div className="text-xl font-bold text-corporate-accentPrimary">
            {formatPercentage(data.f1Score)}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary mb-1">True Positives</div>
          <div className="text-xl font-bold text-corporate-textPrimary">
            {data.truePositives.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrecisionRecall;

