/**
 * DetectorPreview Component - Real backend preview for Detector Studio
 * Uses actual detection API with real data from Snowflake
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Panel } from '../common/Panel';
import { TimeSeriesChart } from '../common/TimeSeriesChart';
import { AnomalyTable } from './AnomalyTable';
import { AnomalyDetails } from './AnomalyDetails';
import { Slider } from '../common/Slider';
import { useDetectorPreview } from '../../hooks/useDetectorPreview';
import { AnomalyApiService } from '../../services/anomalyApi';
import { useToast } from '../../hooks/useToast';
import type { AnomalyEvent, Detector, SeriesRequest } from '../../types/anomaly';

export interface DetectorPreviewProps {
  detector?: Detector;
  k?: number;
  persistence?: number;
  onKChange?: (k: number) => void;
  onPersistenceChange?: (persistence: number) => void;
  className?: string;
  autoRun?: boolean; // Auto-run preview when detector is set
  onPreviewReady?: (runPreview: () => Promise<void>) => void; // Callback to expose runPreview function
}

export const DetectorPreview: React.FC<DetectorPreviewProps> = ({
  detector,
  k: externalK = 3.5,
  persistence: externalPersistence = 2,
  onKChange,
  onPersistenceChange,
  className = '',
  autoRun = false,
  onPreviewReady,
}) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null);
  const [timeSeries, setTimeSeries] = useState<Array<{ timestamp: string; value: number }>>([]);
  const [windowFrom, setWindowFrom] = useState<string>('');
  const [windowTo, setWindowTo] = useState<string>('');
  const autoRunRef = useRef<string | null>(null); // Track last detector ID we auto-ran for
  
  const { anomalies, loading, error, runPreview, clearPreview } = useDetectorPreview({
    detectorId: detector?.id,
  });
  const { showToast } = useToast();

  // Set default time window (last 7 days) or use investigation window if available
  useEffect(() => {
    // Check if detector has investigation time window stored
    if (detector?.params?.investigation_window_from && detector?.params?.investigation_window_to) {
      setWindowFrom(detector.params.investigation_window_from);
      setWindowTo(detector.params.investigation_window_to);
    } else {
      // Default to last 7 days
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setWindowFrom(sevenDaysAgo.toISOString());
      setWindowTo(now.toISOString());
    }
  }, [detector?.id]); // Only run when detector ID changes

  // Fetch time series data when detector or window changes
  useEffect(() => {
    if (!detector || !windowFrom || !windowTo || detector.metrics.length === 0) {
      return;
    }

    const fetchSeries = async () => {
      try {
        const apiService = new AnomalyApiService();
        // Use first metric and first cohort dimension for preview
        // In real usage, user would select these
        const cohortBy = detector.cohort_by || [];
        if (cohortBy.length === 0) {
          return;
        }

        // Get a sample cohort - in production, user would select this
        // For now, we'll need to fetch available cohorts first
        // This is a limitation - we need at least one cohort to preview
        const request: SeriesRequest = {
          cohort: cohortBy.reduce((acc, key) => ({ ...acc, [key]: '' }), {}),
          metric: detector.metrics[0],
          window_from: windowFrom,
          window_to: windowTo,
          granularity: '15m',
        };

        const response = await apiService.getSeries(request);
        setTimeSeries(response.series || []);
      } catch (err) {
        console.error('Failed to fetch time series:', err);
        // Don't show toast for series fetch failures in preview
      }
    };

    fetchSeries();
  }, [detector, windowFrom, windowTo]);

  const handleRunPreview = useCallback(async () => {
    if (!detector?.id) {
      showToast('error', 'Preview Failed', 'Detector must be saved before preview');
      return;
    }

    if (!windowFrom || !windowTo) {
      showToast('error', 'Preview Failed', 'Time window must be set');
      return;
    }

    try {
      const result = await runPreview({
        detector_id: detector.id,
        window_from: windowFrom,
        window_to: windowTo,
      });
      showToast('success', 'Preview Complete', `Found ${result.length} anomalies`);
    } catch (err) {
      // Error already handled in hook
    }
  }, [detector, windowFrom, windowTo, runPreview, showToast]);

  // Expose runPreview function to parent via callback
  useEffect(() => {
    if (onPreviewReady) {
      onPreviewReady(handleRunPreview);
    }
  }, [onPreviewReady, handleRunPreview]);

  // Auto-run preview when detector is created and autoRun is enabled
  useEffect(() => {
    if (autoRun && detector?.id && windowFrom && windowTo && !loading) {
      // Only auto-run once per detector ID to prevent duplicate runs
      if (autoRunRef.current !== detector.id) {
        autoRunRef.current = detector.id;
        handleRunPreview();
      }
    }
  }, [autoRun, detector?.id, windowFrom, windowTo, handleRunPreview, loading]);

  const handleAnomalyClick = useCallback((anomaly: AnomalyEvent) => {
    setSelectedAnomaly(anomaly);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedAnomaly(null);
  }, []);

  const anomalyPoints = useMemo(() => {
    return anomalies.map((a) => ({
      timestamp: a.window_start,
      value: a.observed,
      score: a.score,
      anomaly: a,
    }));
  }, [anomalies]);

  const chartData = useMemo(() => {
    return timeSeries.map((p) => ({
      timestamp: p.timestamp,
      value: p.value,
    }));
  }, [timeSeries]);

  if (!detector) {
    return (
      <Panel title="Preview" variant="outlined" padding="md">
        <div className="text-sm text-corporate-textTertiary p-4 text-center">
          Save detector configuration to enable preview
        </div>
      </Panel>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Configuration Section */}
      <div className="space-y-4">
        <Panel title="Configuration" variant="outlined" padding="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
                Time Window
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  value={windowFrom ? new Date(windowFrom).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setWindowFrom(new Date(e.target.value).toISOString())}
                  className="px-3 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-borderPrimary text-corporate-textPrimary"
                />
                <input
                  type="datetime-local"
                  value={windowTo ? new Date(windowTo).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setWindowTo(new Date(e.target.value).toISOString())}
                  className="px-3 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-borderPrimary text-corporate-textPrimary"
                />
              </div>
            </div>

            <Slider
              label="K (Threshold)"
              value={externalK}
              min={1.0}
              max={10.0}
              step={0.1}
              onChange={(newK) => {
                onKChange?.(newK);
              }}
              disabled={loading}
              description="Multiplier for anomaly score threshold"
            />

            <Slider
              label="Persistence"
              value={externalPersistence}
              min={1}
              max={10}
              step={1}
              onChange={(newPersistence) => {
                onPersistenceChange?.(newPersistence);
              }}
              disabled={loading}
              description="Consecutive windows required"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleRunPreview}
                disabled={loading || !detector.id}
                className="px-4 py-2 rounded-lg bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Run preview"
              >
                {loading ? 'Running Preview...' : 'Run Preview'}
              </button>
              <button
                type="button"
                onClick={clearPreview}
                disabled={loading || anomalies.length === 0}
                className="px-4 py-2 rounded-lg bg-corporate-bgSecondary hover:bg-corporate-bgTertiary text-corporate-textPrimary border border-corporate-borderPrimary font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Clear preview"
              >
                Clear
              </button>
            </div>

            {error && (
              <div className="pt-2 border-t border-corporate-borderPrimary/40">
                <div className="text-sm text-red-400">
                  Error: {error.message}
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Preview Section - Full Width Below */}
      <div className="w-full space-y-4">
        <Panel title="Preview Results" variant="outlined" padding="md">
          <div className="space-y-4">
            {timeSeries.length > 0 && (
              <div className="w-full overflow-x-auto">
                <TimeSeriesChart
                  data={chartData}
                  anomalyPoints={anomalyPoints}
                  width={800}
                  height={400}
                  showGrid={true}
                  showPoints={false}
                  onAnomalyClick={handleAnomalyClick}
                  className="min-w-full"
                />
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-corporate-textPrimary mb-2">
                Anomalies ({anomalies.length})
              </h4>
              {anomalies.length > 0 ? (
                <AnomalyTable
                  anomalies={anomalies}
                  onAnomalyClick={handleAnomalyClick}
                />
              ) : (
                <div className="text-sm text-corporate-textTertiary p-4 text-center">
                  {loading
                    ? 'Running preview...'
                    : 'No anomalies detected. Adjust parameters and try again.'}
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* Anomaly Details Modal */}
      {selectedAnomaly && (
        <AnomalyDetails
          anomaly={selectedAnomaly}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
};
