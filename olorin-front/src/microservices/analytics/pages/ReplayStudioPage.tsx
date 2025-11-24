/**
 * ReplayStudioPage Component - Page for replay detection and comparison
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React, { useState } from 'react';
import { AnalyticsHeader } from '../components/common/AnalyticsHeader';
import { Panel } from '../components/common/Panel';
import { ReplayComparison } from '../components/anomaly/ReplayComparison';
import { ProgressIndicator } from '../components/common/ProgressIndicator';
import { DetectorForm } from '../components/anomaly/DetectorForm';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useDetectors } from '../hooks/useDetectors';
import { useToast } from '../hooks/useToast';
import { AnomalyApiService } from '../services/anomalyApi';
import type { Detector, ReplayResponse } from '../types/anomaly';

export const ReplayStudioPage: React.FC = () => {
  const { detectors, loading: detectorsLoading } = useDetectors();
  const [selectedDetector, setSelectedDetector] = useState<Detector | null>(null);
  const [windowFrom, setWindowFrom] = useState<string>('');
  const [windowTo, setWindowTo] = useState<string>('');
  const [replayResult, setReplayResult] = useState<ReplayResponse | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const { showToast } = useToast();
  const apiService = new AnomalyApiService();

  // Set default time window (last 7 days)
  React.useEffect(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    setWindowFrom(sevenDaysAgo.toISOString().slice(0, 16));
    setWindowTo(now.toISOString().slice(0, 16));
  }, []);

  const handleRunReplay = async () => {
    console.log('handleRunReplay called', { selectedDetector, windowFrom, windowTo });
    
    if (!selectedDetector) {
      showToast('error', 'No Detector Selected', 'Please select or create a detector first');
      return;
    }

    if (!windowFrom || !windowTo) {
      showToast('error', 'Invalid Time Window', 'Please select both start and end times');
      return;
    }

    // Validate time window duration (max 30 days)
    const fromDate = new Date(windowFrom);
    const toDate = new Date(windowTo);
    const maxWindowDays = 30;
    const maxWindowMs = maxWindowDays * 24 * 60 * 60 * 1000;
    const windowDurationMs = toDate.getTime() - fromDate.getTime();
    
    if (windowDurationMs > maxWindowMs) {
      showToast(
        'error',
        'Time Window Too Large',
        `Time window cannot exceed ${maxWindowDays} days. Please select a shorter time range.`
      );
      return;
    }

    if (fromDate >= toDate) {
      showToast('error', 'Invalid Time Window', 'Start time must be before end time');
      return;
    }

    // Validate and filter detector configuration
    // Handle both snake_case (cohort_by) and camelCase (cohortBy) for compatibility
    const cohortByArray = (selectedDetector.cohort_by || (selectedDetector as any).cohortBy || []).filter((c: string) => c && c.trim());
    const metricsArray = (selectedDetector.metrics || []).filter((m: string) => m && m.trim());

    if (cohortByArray.length === 0) {
      showToast('error', 'Invalid Detector Configuration', 'Detector must have at least one cohort dimension configured');
      return;
    }

    if (metricsArray.length === 0) {
      showToast('error', 'Invalid Detector Configuration', 'Detector must have at least one metric configured');
      return;
    }

    let progressInterval: NodeJS.Timeout | null = null;
    try {
      setReplayLoading(true);
      setReplayProgress(0);
      setReplayResult(null);

      // Simulate progress (in real implementation, this would poll the run status)
      progressInterval = setInterval(() => {
        setReplayProgress((prev) => {
          if (prev >= 90) {
            if (progressInterval) {
              clearInterval(progressInterval);
            }
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Convert datetime-local format to ISO format for API
      const windowFromISO = new Date(windowFrom).toISOString();
      const windowToISO = new Date(windowTo).toISOString();

      const result = await apiService.replayDetection({
        detector_config: {
          name: selectedDetector.name,
          type: selectedDetector.type,
          cohort_by: cohortByArray,
          metrics: metricsArray,
          params: selectedDetector.params,
          enabled: selectedDetector.enabled,
        },
        window_from: windowFromISO,
        window_to: windowToISO,
      });

      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setReplayProgress(100);
      setReplayResult(result);
      
      const anomalyCount = result.comparison?.replay_anomalies?.length || 0;
      showToast('success', 'Replay Complete', `Found ${anomalyCount} anomalies`);
    } catch (err) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Replay failed:', err);
      showToast('error', 'Replay Failed', errorMessage);
    } finally {
      setReplayLoading(false);
      setTimeout(() => setReplayProgress(0), 2000);
    }
  };

  const handlePromoteConfig = async () => {
    if (!selectedDetector) return;

    try {
      await apiService.promoteDetector(selectedDetector.id);
      showToast('success', 'Detector Promoted', 'Configuration promoted to production');
    } catch (err) {
      showToast('error', 'Promotion Failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (detectorsLoading) {
    return (
      <div className="min-h-screen bg-corporate-bgPrimary p-6">
        <div className="max-w-7xl mx-auto">
          <SkeletonLoader variant="chart" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-corporate-bgPrimary p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <AnalyticsHeader
            title="Replay Studio"
            subtitle="Backtest detector settings on historical data"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Configuration */}
            <div className="lg:col-span-1 space-y-4">
              <Panel title="Configuration" variant="outlined" padding="md">
                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-sm font-medium text-corporate-textPrimary mb-2"
                      htmlFor="detector-select"
                    >
                      Detector
                    </label>
                    <select
                      id="detector-select"
                      value={selectedDetector?.id || ''}
                      onChange={(e) => {
                        const detector = detectors.find((d) => d.id === e.target.value);
                        setSelectedDetector(detector || null);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-borderPrimary text-corporate-textPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary"
                      aria-label="Select detector"
                    >
                      <option value="">Select a detector...</option>
                      {detectors.map((detector) => (
                        <option key={detector.id} value={detector.id}>
                          {detector.name} ({detector.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium text-corporate-textPrimary mb-2"
                      htmlFor="window-from"
                    >
                      Window Start
                    </label>
                    <input
                      id="window-from"
                      type="datetime-local"
                      value={windowFrom}
                      onChange={(e) => setWindowFrom(e.target.value)}
                      max={windowTo || undefined}
                      className="w-full px-3 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-borderPrimary text-corporate-textPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary"
                      aria-label="Window start time"
                    />
                    <p className="text-xs text-corporate-textSecondary mt-1">
                      Maximum window: 30 days
                    </p>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium text-corporate-textPrimary mb-2"
                      htmlFor="window-to"
                    >
                      Window End
                    </label>
                    <input
                      id="window-to"
                      type="datetime-local"
                      value={windowTo}
                      onChange={(e) => setWindowTo(e.target.value)}
                      min={windowFrom || undefined}
                      className="w-full px-3 py-2 rounded-lg bg-corporate-bgSecondary border border-corporate-borderPrimary text-corporate-textPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary"
                      aria-label="Window end time"
                    />
                    {windowFrom && windowTo && (() => {
                      const fromDate = new Date(windowFrom);
                      const toDate = new Date(windowTo);
                      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
                      const maxDays = 30;
                      const isValid = daysDiff > 0 && daysDiff <= maxDays;
                      return (
                        <p className={`text-xs mt-1 ${isValid ? 'text-corporate-textSecondary' : 'text-red-400'}`}>
                          {daysDiff > 0 
                            ? `${daysDiff} day${daysDiff !== 1 ? 's' : ''} selected${daysDiff > maxDays ? ` (exceeds ${maxDays} day limit)` : ''}`
                            : 'End time must be after start time'}
                        </p>
                      );
                    })()}
                  </div>

                  {replayLoading && (
                    <ProgressIndicator
                      progress={replayProgress}
                      status="running"
                      message="Running replay detection..."
                    />
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!replayLoading && selectedDetector && windowFrom && windowTo) {
                          handleRunReplay();
                        }
                      }}
                      disabled={replayLoading || !selectedDetector || !windowFrom || !windowTo}
                      className="flex-1 px-4 py-2 rounded-lg bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Run replay"
                    >
                      Run Replay
                    </button>
                    {replayResult && selectedDetector && (
                      <button
                        type="button"
                        onClick={handlePromoteConfig}
                        className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                        aria-label="Promote config to production"
                      >
                        Promote Config
                      </button>
                    )}
                  </div>
                </div>
              </Panel>

              {selectedDetector && (
                <DetectorForm
                  detector={selectedDetector}
                  onSubmit={async (detectorData) => {
                    // Update detector via API
                    const updated = await apiService.updateDetector(selectedDetector.id, detectorData);
                    setSelectedDetector(updated);
                    showToast('success', 'Detector Updated', 'Configuration saved');
                  }}
                />
              )}
            </div>

            {/* Right: Results */}
            <div className="lg:col-span-2">
              {replayResult ? (
                <ReplayComparison comparison={replayResult.comparison} />
              ) : (
                <Panel title="Results" variant="outlined" padding="lg">
                  <EmptyState
                    title="No Replay Results"
                    message="Configure a detector and time window, then click 'Run Replay' to see comparison results."
                  />
                </Panel>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

