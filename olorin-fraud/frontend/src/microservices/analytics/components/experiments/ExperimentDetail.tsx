/**
 * Experiment Detail Component - Display and edit experiment details.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { VariantComparison } from './VariantComparison';
import { GuardrailMonitor } from './GuardrailMonitor';
import type { Experiment } from '../../types/experiments';

interface ExperimentDetailProps {
  experimentId: string;
  onBack?: () => void;
}

const ExperimentDetail: React.FC<ExperimentDetailProps> = ({ experimentId, onBack }) => {
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadExperiment();
  }, [experimentId]);

  const loadExperiment = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getExperiment(experimentId);
      setExperiment(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load experiment'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<Experiment>) => {
    try {
      const updated = await analyticsService.updateExperiment(experimentId, updates);
      setExperiment(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update experiment'));
    }
  };

  const handlePromote = async (variantId: string) => {
    try {
      await analyticsService.promoteExperiment(experimentId, variantId);
      await loadExperiment();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to promote variant'));
    }
  };

  if (loading) {
    return <LoadingState message="Loading experiment..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Experiment"
        message={error.message}
        actionLabel="Retry"
        onAction={loadExperiment}
      />
    );
  }

  if (!experiment) {
    return (
      <EmptyState
        title="Experiment Not Found"
        message="The requested experiment could not be found."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-corporate-textSecondary hover:text-corporate-textPrimary mb-2"
          >
            ← Back to Experiments
          </button>
          <h1 className="text-3xl font-bold text-corporate-textPrimary">{experiment.name}</h1>
          {experiment.description && (
            <p className="text-corporate-textSecondary mt-2">{experiment.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-border text-corporate-textPrimary hover:bg-corporate-bgTertiary"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Details</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-corporate-textSecondary">Status:</span>{' '}
              <span className="text-corporate-textPrimary font-medium">{experiment.status}</span>
            </div>
            <div>
              <span className="text-corporate-textSecondary">Start Date:</span>{' '}
              <span className="text-corporate-textPrimary">
                {new Date(experiment.startDate).toLocaleString()}
              </span>
            </div>
            {experiment.endDate && (
              <div>
                <span className="text-corporate-textSecondary">End Date:</span>{' '}
                <span className="text-corporate-textPrimary">
                  {new Date(experiment.endDate).toLocaleString()}
                </span>
              </div>
            )}
            <div>
              <span className="text-corporate-textSecondary">Created By:</span>{' '}
              <span className="text-corporate-textPrimary">{experiment.createdBy}</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
            Success Metrics
          </h3>
          <div className="flex flex-wrap gap-2">
            {experiment.successMetrics.map((metric) => (
              <span
                key={metric}
                className="px-3 py-1 rounded-full bg-corporate-accentPrimary/20 text-corporate-accentPrimary text-xs"
              >
                {metric}
              </span>
            ))}
          </div>
        </div>
      </div>

      {experiment.variants.length > 0 && (
        <VariantComparison
          variants={experiment.variants}
          onPromote={handlePromote}
          experimentId={experimentId}
        />
      )}

      {experiment.guardrails.length > 0 && (
        <GuardrailMonitor experimentId={experimentId} guardrails={experiment.guardrails} />
      )}

      {experiment.results && (
        <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Results</h3>
          {experiment.results.winner && (
            <div className="mb-2">
              <span className="text-corporate-textSecondary">Winner:</span>{' '}
              <span className="text-corporate-textPrimary font-medium">
                {experiment.results.winner}
              </span>
            </div>
          )}
          {experiment.results.conclusion && (
            <p className="text-corporate-textSecondary">{experiment.results.conclusion}</p>
          )}
          {experiment.results.recommendation && (
            <div className="mt-2">
              <span className="text-corporate-textSecondary">Recommendation:</span>{' '}
              <span className="text-corporate-textPrimary font-medium">
                {experiment.results.recommendation}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExperimentDetail;

