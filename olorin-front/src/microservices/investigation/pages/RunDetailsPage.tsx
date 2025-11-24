/**
 * Run Details Page with Real-Time Updates
 * Task: T060 - Phase 7 User Story 3
 * Feature: 007-progress-wizard-page
 *
 * Displays investigation run details with real-time SSE/polling updates.
 * Shows tool status, output/logs, and handles SSE to polling transitions.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useSSEPollingFallback } from '../hooks/useSSEPollingFallback';
import { useProgressData } from '../hooks/useProgressData';
import { useEventDeduplication } from '../hooks/useEventDeduplication';

export const RunDetailsPage: React.FC = () => {
  const params = useParams<{ investigationId: string; runId: string }>();
  const investigationId = params.investigationId;
  const runId = params.runId;

  const { progress, isLoading, error: progressError } = useProgressData(
    investigationId,
    true
  );

  const {
    events,
    isUsingSSE,
    isUsingPolling,
    sseError,
    pollingPaused
  } = useSSEPollingFallback({
    investigationId,
    runId,
    status: progress?.status || 'pending',
    lifecycleStage: progress?.lifecycleStage,
    pollingCallback: async () => {},
    enabled: true
  });

  const deduplicatedEvents = useEventDeduplication(events);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-corporate-textPrimary">Loading run details...</div>
      </div>
    );
  }

  if (progressError) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-corporate-error">Error: {progressError.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-corporate-textPrimary mb-2">
            Run Details
          </h1>
          <p className="text-corporate-textSecondary">
            Investigation: {investigationId} | Run: {runId}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">
                Real-Time Events
              </h2>

              <div className="mb-4 flex items-center space-x-4">
                {isUsingSSE && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-corporate-textSecondary">
                      SSE Connected
                    </span>
                  </div>
                )}

                {isUsingPolling && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                    <span className="text-sm text-corporate-textSecondary">
                      Polling Mode
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {deduplicatedEvents.length === 0 ? (
                  <p className="text-corporate-textTertiary text-sm">
                    No events yet...
                  </p>
                ) : (
                  deduplicatedEvents.map(event => (
                    <div
                      key={event.id}
                      className="bg-black/30 backdrop-blur border-2 border-corporate-borderSecondary/40 rounded p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-cyan-400">
                          {event.type}
                        </span>
                        <span className="text-xs text-corporate-textTertiary">
                          {event.timestamp}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
                Run Status
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-corporate-textTertiary">Status</dt>
                  <dd className="text-sm font-medium text-corporate-textPrimary">
                    {progress?.status || 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-corporate-textTertiary">Events</dt>
                  <dd className="text-sm font-medium text-corporate-textPrimary">
                    {deduplicatedEvents.length}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
