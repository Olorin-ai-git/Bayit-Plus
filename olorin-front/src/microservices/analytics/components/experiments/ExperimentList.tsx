/**
 * Experiment List Component - Display list of experiments.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import type { Experiment } from '../../types/experiments';

interface ExperimentListProps {
  onSelectExperiment?: (experimentId: string) => void;
}

const ExperimentList: React.FC<ExperimentListProps> = ({ onSelectExperiment }) => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadExperiments();
  }, [statusFilter]);

  const loadExperiments = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.listExperiments(statusFilter || undefined);
      setExperiments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load experiments'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading experiments..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Experiments"
        message={error.message}
        actionLabel="Retry"
        onAction={loadExperiments}
      />
    );
  }

  if (experiments.length === 0) {
    return (
      <EmptyState
        title="No Experiments"
        message="No experiments found. Create your first experiment to get started."
      />
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-corporate-success';
      case 'paused':
        return 'bg-corporate-warning';
      case 'completed':
        return 'bg-corporate-info';
      case 'cancelled':
        return 'bg-corporate-error';
      default:
        return 'bg-corporate-textSecondary';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-corporate-textPrimary">Experiments</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-border text-corporate-textPrimary"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="running">Running</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="grid gap-4">
        {experiments.map((experiment) => (
          <div
            key={experiment.id}
            onClick={() => onSelectExperiment?.(experiment.id)}
            className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border hover:border-corporate-accentPrimary cursor-pointer transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-corporate-textPrimary">
                    {experiment.name}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(experiment.status)}`}
                  >
                    {experiment.status}
                  </span>
                </div>
                {experiment.description && (
                  <p className="text-sm text-corporate-textSecondary mb-3">
                    {experiment.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-corporate-textSecondary">
                  <span>Variants: {experiment.variants.length}</span>
                  <span>Start: {new Date(experiment.startDate).toLocaleDateString()}</span>
                  {experiment.endDate && (
                    <span>End: {new Date(experiment.endDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExperimentList;

