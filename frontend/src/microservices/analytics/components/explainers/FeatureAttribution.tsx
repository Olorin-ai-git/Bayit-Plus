/**
 * Feature Attribution Component - Display SHAP values and feature importance.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { formatPercentage } from '../../utils/formatters';

interface FeatureAttributionProps {
  decisionId: string;
}

const FeatureAttribution: React.FC<FeatureAttributionProps> = ({ decisionId }) => {
  const [attributions, setAttributions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadAttributions();
  }, [decisionId]);

  const loadAttributions = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.explainDecision(decisionId);
      setAttributions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load feature attributions'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading feature attributions..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Attributions"
        message={error.message}
        actionLabel="Retry"
        onAction={loadAttributions}
      />
    );
  }

  if (!attributions || !attributions.topFeatures) {
    return (
      <EmptyState
        title="No Attributions Available"
        message="Feature attributions could not be calculated for this decision."
      />
    );
  }

  const getAttributionColor = (value: number) => {
    if (value > 0) return 'text-corporate-error';
    if (value < 0) return 'text-corporate-success';
    return 'text-corporate-textPrimary';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-corporate-textPrimary mb-2">Feature Attribution</h2>
        <p className="text-corporate-textSecondary">
          SHAP values showing feature contributions to the decision
        </p>
      </div>

      <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
        <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Top Features</h3>
        <div className="space-y-3">
          {attributions.topFeatures.map((feature: any, index: number) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-corporate-bgTertiary border border-corporate-border"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-corporate-textSecondary">
                    #{index + 1}
                  </span>
                  <span className="font-semibold text-corporate-textPrimary">
                    {feature.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                </div>
                <span className={`text-lg font-bold ${getAttributionColor(feature.attribution)}`}>
                  {feature.attribution > 0 ? '+' : ''}
                  {formatPercentage(Math.abs(feature.attribution))}
                </span>
              </div>
              <div className="text-sm text-corporate-textSecondary">
                Value: {String(feature.value || 'N/A')}
              </div>
              <div className="mt-2 h-2 bg-corporate-bgSecondary rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    feature.attribution > 0 ? 'bg-corporate-error' : 'bg-corporate-success'
                  }`}
                  style={{
                    width: `${Math.min(Math.abs(feature.attribution) * 100, 100)}%`,
                    marginLeft: feature.attribution < 0 ? 'auto' : '0',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {attributions.ruleTrace && attributions.ruleTrace.length > 0 && (
        <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Rule Trace</h3>
          <div className="space-y-2">
            {attributions.ruleTrace.map((rule: any, index: number) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-corporate-bgTertiary border border-corporate-border"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-corporate-textPrimary">{rule.rule}</div>
                    <div className="text-sm text-corporate-textSecondary">{rule.condition}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-corporate-textSecondary">Value: {rule.value}</div>
                    <div className="text-sm font-medium text-corporate-accentPrimary">
                      {formatPercentage(rule.contribution)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureAttribution;

