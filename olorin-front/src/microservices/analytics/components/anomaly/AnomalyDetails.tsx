/**
 * AnomalyDetails Component - Drawer showing anomaly details
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';
import { Panel } from '../common/Panel';
import { SeverityBadge } from '../common/SeverityBadge';
import { TimeSeriesChart } from '../common/TimeSeriesChart';
import { useInvestigation } from '../../hooks/useInvestigation';
import { useToast } from '../../hooks/useToast';
import type { AnomalyEvent } from '../../types/anomaly';

export interface AnomalyDetailsProps {
  anomaly: AnomalyEvent | null;
  onClose: () => void;
  onInvestigate?: (anomaly: AnomalyEvent) => void;
  className?: string;
}

export const AnomalyDetails: React.FC<AnomalyDetailsProps> = ({
  anomaly,
  onClose,
  onInvestigate,
  className = '',
}) => {
      const { createInvestigation, isCreating } = useInvestigation({
        onInvestigationCreated: (response) => {
          onClose();
          // Navigate to investigation progress page
          const targetUrl = `/investigation/progress?id=${response.investigation_id}`;
          console.log('[AnomalyDetails] Navigating to:', targetUrl);
          // Try window.olorin.navigate first (if available), fallback to window.location.href
          if (window.olorin?.navigate && typeof window.olorin.navigate === 'function') {
            window.olorin.navigate(targetUrl);
          } else {
            // Fallback to window.location.href for shell-level navigation
            window.location.href = targetUrl;
          }
        },
      });
      const { showToast } = useToast();

  if (!anomaly) return null;

  const timeSeriesData = anomaly.evidence?.time_series || [];
  const anomalyPoint = {
    timestamp: anomaly.window_start,
    value: anomaly.observed,
  };

  const reasoning = anomaly.evidence?.reasoning || 
    (anomaly.evidence && typeof anomaly.evidence === 'object' && 'reasoning' in anomaly.evidence 
      ? String(anomaly.evidence.reasoning) 
      : 'No reasoning available');

        const handleInvestigate = async () => {
          try {
            if (!anomaly.id) {
              showToast('error', 'Investigation Failed', 'Anomaly ID is missing');
              return;
            }
            const result = await createInvestigation(anomaly.id);
            if (result) {
              onClose();
            }
          } catch (error) {
            // Error already handled in hook
          }
        };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center ${className}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="anomaly-details-title"
    >
      {/* Opaque backdrop with blur */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      
      {/* Modal content */}
      <div
        className="relative bg-corporate-bgSecondary rounded-t-lg sm:rounded-lg border-2 border-corporate-borderPrimary/60 w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2
                id="anomaly-details-title"
                className="text-2xl font-bold text-corporate-textPrimary mb-2"
              >
                Anomaly Details
              </h2>
              <SeverityBadge severity={anomaly.severity || 'info'} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-corporate-textSecondary hover:text-corporate-textPrimary transition-colors"
              aria-label="Close details"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <Panel title="Basic Information" variant="outlined" padding="md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-corporate-textSecondary mb-1">
                    Metric
                  </div>
                  <div className="text-corporate-textPrimary font-medium">
                    {anomaly.metric}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-corporate-textSecondary mb-1">
                    Score
                  </div>
                  <div className="text-corporate-textPrimary font-medium">
                    {anomaly.score.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-corporate-textSecondary mb-1">
                    Observed
                  </div>
                  <div className="text-corporate-textPrimary font-medium">
                    {typeof anomaly.observed === 'number'
                      ? anomaly.observed.toFixed(2)
                      : String(anomaly.observed)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-corporate-textSecondary mb-1">
                    Expected
                  </div>
                  <div className="text-corporate-textPrimary font-medium">
                    {typeof anomaly.expected === 'number'
                      ? anomaly.expected.toFixed(2)
                      : String(anomaly.expected)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-corporate-textSecondary mb-1">
                    Window Start
                  </div>
                  <div className="text-corporate-textPrimary font-medium">
                    {new Date(anomaly.window_start).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-corporate-textSecondary mb-1">
                    Window End
                  </div>
                  <div className="text-corporate-textPrimary font-medium">
                    {new Date(anomaly.window_end).toLocaleString()}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Cohort" variant="outlined" padding="md">
              <div className="space-y-2">
                {Object.entries(anomaly.cohort).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-sm text-corporate-textSecondary w-24">
                      {key}:
                    </span>
                    <span className="text-corporate-textPrimary font-medium">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            {timeSeriesData.length > 0 && (
              <Panel title="Time Series" variant="outlined" padding="md">
                <TimeSeriesChart
                  data={timeSeriesData.map((d) => ({
                    timestamp: d.timestamp,
                    value: d.value,
                  }))}
                  anomalyPoints={[anomalyPoint]}
                  width={700}
                  height={250}
                  showGrid={true}
                  showPoints={true}
                />
              </Panel>
            )}

            {reasoning && reasoning !== 'No reasoning available' && (
              <Panel title="Reasoning" variant="outlined" padding="md">
                <div className="text-sm text-corporate-textPrimary whitespace-pre-wrap">
                  {reasoning}
                </div>
              </Panel>
            )}

            {anomaly.evidence && (
              <Panel title="Evidence" variant="outlined" padding="md">
                <pre className="text-xs text-corporate-textSecondary overflow-x-auto">
                  {JSON.stringify(anomaly.evidence, null, 2)}
                </pre>
              </Panel>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInvestigate();
                }}
                disabled={isCreating}
                className="px-4 py-2 rounded-lg bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Create investigation for this anomaly"
              >
                {isCreating ? 'Creating Investigation...' : 'Investigate'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-corporate-bgSecondary hover:bg-corporate-bgTertiary text-corporate-textPrimary border border-corporate-borderPrimary font-medium transition-colors"
                aria-label="Close details"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

