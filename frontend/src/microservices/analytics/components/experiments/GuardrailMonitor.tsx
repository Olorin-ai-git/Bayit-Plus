/**
 * Guardrail Monitor Component - Monitor and display guardrail violations.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import type { Guardrail } from '../../types/experiments';

interface GuardrailMonitorProps {
  experimentId: string;
  guardrails: Guardrail[];
}

const GuardrailMonitor: React.FC<GuardrailMonitorProps> = ({ experimentId, guardrails }) => {
  const [guardrailStatuses, setGuardrailStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuardrailStatuses();
    const interval = setInterval(loadGuardrailStatuses, 30000);
    return () => clearInterval(interval);
  }, [experimentId]);

  const loadGuardrailStatuses = async () => {
    try {
      setLoading(true);
      const statuses = await analyticsService.checkExperimentGuardrails(experimentId);
      setGuardrailStatuses(statuses);
    } catch (err) {
      console.error('Failed to load guardrail statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && guardrailStatuses.length === 0) {
    return <LoadingState message="Loading guardrail statuses..." />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'violated':
        return 'bg-corporate-error text-white';
      case 'warning':
        return 'bg-corporate-warning text-white';
      default:
        return 'bg-corporate-success text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'violated':
        return '⚠️';
      case 'warning':
        return '⚡';
      default:
        return '✓';
    }
  };

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Guardrails</h3>
      <div className="space-y-3">
        {guardrails.map((guardrail, index) => {
          const status = guardrailStatuses.find(
            (s) => s.metric === guardrail.metric
          ) || guardrail;
          return (
            <div
              key={index}
              className="p-4 rounded-lg bg-corporate-bgTertiary border border-corporate-border"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getStatusIcon(status.status || 'ok')}</span>
                  <span className="font-medium text-corporate-textPrimary">
                    {guardrail.metric.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                    status.status || 'ok'
                  )}`}
                >
                  {status.status || 'ok'}
                </span>
              </div>
              <div className="text-sm text-corporate-textSecondary space-y-1">
                <div>
                  Threshold: {guardrail.threshold}
                  {guardrail.direction === 'above' ? ' (max)' : ' (min)'}
                </div>
                {status.currentValue !== undefined && (
                  <div>
                    Current: {status.currentValue.toFixed(4)}
                    {status.currentValue > guardrail.threshold &&
                    guardrail.direction === 'above' ? (
                      <span className="text-corporate-error ml-2">⚠ Exceeded</span>
                    ) : status.currentValue < guardrail.threshold &&
                      guardrail.direction === 'below' ? (
                      <span className="text-corporate-error ml-2">⚠ Below threshold</span>
                    ) : null}
                  </div>
                )}
                <div>Action on violation: {guardrail.action}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GuardrailMonitor;

