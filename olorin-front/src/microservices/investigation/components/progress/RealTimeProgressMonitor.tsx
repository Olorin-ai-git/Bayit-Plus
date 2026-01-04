/**
 * Real-Time Progress Monitor Component
 * Feature: 008-live-investigation-updates (US1)
 *
 * Main component for live investigation monitoring.
 * Orchestrates progress data fetching, SSE streaming,
 * polling fallback, and UI updates.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { InvestigationProgress } from '../../../../shared/types/investigation';
import { useProgressData } from '../../hooks/useProgressData';
import { useSSEPollingFallback } from '../../hooks/useSSEPollingFallback';
import { ProgressBar } from './ProgressBar';
import { ToolExecutionsList } from './ToolExecutionsList';
import { ConnectionStatus } from './ConnectionStatus';
import './RealTimeProgressMonitor.css';

export interface RealTimeProgressMonitorProps {
  investigationId: string;
  runId?: string;
  enabled?: boolean;
  onProgressUpdate?: (progress: InvestigationProgress) => void;
  onStatusChange?: (status: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Real-Time Progress Monitor
 *
 * Complete implementation of US1: Real-Time Progress Monitoring
 * - Fetches progress data via /progress endpoint
 * - Streams updates via SSE
 * - Falls back to polling if SSE unavailable
 * - ETag-based caching for efficiency
 * - Multi-tab coordination
 */
export const RealTimeProgressMonitor: React.FC<RealTimeProgressMonitorProps> = ({
  investigationId,
  runId,
  enabled = true,
  onProgressUpdate,
  onStatusChange,
  onError
}) => {
  const [displayMode, setDisplayMode] = useState<'simple' | 'detailed'>('detailed');
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // Fetch progress data with adaptive polling
  const {
    progress,
    isLoading,
    error,
    refetch
  } = useProgressData(enabled ? investigationId : undefined, enabled);

  // SSE with polling fallback
  const {
    isUsingSSE,
    isUsingPolling
  } = useSSEPollingFallback({
    investigationId: enabled ? investigationId : undefined,
    runId,
    status: progress?.status || 'pending',
    lifecycleStage: progress?.lifecycleStage as any,
    pollingCallback: refetch,
    enabled
  });

  // Call callbacks on updates
  useEffect(() => {
    if (progress) {
      onProgressUpdate?.(progress);
    }
  }, [progress, onProgressUpdate]);

  useEffect(() => {
    if (progress?.status) {
      onStatusChange?.(progress.status);
    }
  }, [progress?.status, onStatusChange]);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!progress) {
      return {
        progressPercent: 0,
        toolsCompleted: 0,
        totalTools: 0,
        activePhase: '—',
        estimatedTimeRemaining: '—'
      };
    }

    return {
      progressPercent: progress.completionPercent,
      toolsCompleted: progress.completedTools,
      totalTools: progress.totalTools,
      activePhase: progress.currentPhase || 'N/A',
      estimatedTimeRemaining: progress.toolsPerSecond > 0
        ? `${Math.ceil((progress.totalTools - (progress.totalTools * progress.completionPercent / 100)) / progress.toolsPerSecond / 60)}m`
        : '—'
    };
  }, [progress]);

  // Check if terminal status
  const isTerminal = useMemo(() => {
    if (!progress) return false;
    return ['completed', 'failed', 'cancelled'].includes(progress.status);
  }, [progress?.status]);

  return (
    <div className="real-time-progress-monitor">
      {/* Header */}
      <div className="monitor-header">
        <h2 className="monitor-title">Investigation Progress</h2>

        {/* Controls */}
        <div className="monitor-controls">
          <button
            className={`view-toggle ${displayMode === 'simple' ? 'active' : ''}`}
            onClick={() => setDisplayMode('simple')}
            aria-label="Simple view"
          >
            Simple
          </button>
          <button
            className={`view-toggle ${displayMode === 'detailed' ? 'active' : ''}`}
            onClick={() => setDisplayMode('detailed')}
            aria-label="Detailed view"
          >
            Detailed
          </button>

          {/* Refresh button */}
          <button
            className="refresh-button"
            onClick={refetch}
            disabled={isLoading}
            title="Refresh progress data"
            aria-label="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <ConnectionStatus
        isConnected={!error && (isUsingSSE || isUsingPolling)}
        isUsingSSE={isUsingSSE}
        isUsingPolling={isUsingPolling}
        lastUpdate={progress?.lastUpdatedAt ? new Date(progress.lastUpdatedAt) : undefined}
        error={error?.message}
      />

      {/* Main Progress Bar */}
      <ProgressBar
        progress={progress}
        isLoading={isLoading}
        error={error}
        showLabel={true}
        showDetails={displayMode === 'detailed'}
        size="lg"
      />

      {/* Error Display */}
      {error && (
        <div className="error-container">
          <span className="error-icon">⚠</span>
          <span className="error-message">{error.message}</span>
          <button
            className="error-dismiss"
            onClick={refetch}
          >
            Retry
          </button>
        </div>
      )}

      {/* Detailed View */}
      {displayMode === 'detailed' && progress && (
        <>
          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Status</span>
              <span className="metric-value status-badge">
                {progress.status.toUpperCase()}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Tools</span>
              <span className="metric-value">
                {metrics.toolsCompleted}/{metrics.totalTools}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Speed</span>
              <span className="metric-value">
                {progress.toolsPerSecond.toFixed(1)}/sec
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">ETA</span>
              <span className="metric-value">
                {metrics.estimatedTimeRemaining}
              </span>
            </div>
          </div>

          {/* Phases Section */}
          {progress.phases && progress.phases.length > 0 && (
            <div className="phases-section">
              <h3 className="section-title">Phases ({progress.phases.length})</h3>
              <div className="phases-list">
                {progress.phases.map((phase) => (
                  <div
                    key={phase.id}
                    className={`phase-item status-${phase.status}`}
                    onClick={() =>
                      setExpandedPhase(expandedPhase === phase.id ? null : phase.id)
                    }
                  >
                    <div className="phase-header">
                      <span className="phase-indicator">
                        {phase.status === 'completed' && '✓'}
                        {phase.status === 'in_progress' && '◉'}
                        {phase.status === 'pending' && '○'}
                        {phase.status === 'failed' && '✕'}
                      </span>
                      <span className="phase-name">{phase.name}</span>
                      <span className="phase-completion">
                        {phase.completionPercent}%
                      </span>
                    </div>

                    {expandedPhase === phase.id && (
                      <div className="phase-details">
                        <div className="detail-row">
                          <span>Tools: {phase.toolExecutionIds.length}</span>
                        </div>
                        {phase.startedAt && (
                          <div className="detail-row">
                            <span>
                              Started: {new Date(phase.startedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool Executions */}
          {progress.toolExecutions && progress.toolExecutions.length > 0 && (
            <div className="tools-section">
              <ToolExecutionsList
                executions={progress.toolExecutions}
                isLoading={isLoading}
                maxItems={10}
                sortBy="newest"
              />
            </div>
          )}

          {/* Risk Metrics */}
          {progress.riskMetrics && (
            <div className="risk-section">
              <h3 className="section-title">Risk Assessment</h3>
              <div className="risk-metrics">
                <div className="risk-metric">
                  <span className="label">Overall Risk:</span>
                  <span className="value">
                    {(progress.riskMetrics.overall * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="risk-metric">
                  <span className="label">Confidence:</span>
                  <span className="value">
                    {(progress.riskMetrics.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Entities */}
          {progress.entities && progress.entities.length > 0 && (
            <div className="entities-section">
              <h3 className="section-title">Entities ({progress.entities.length})</h3>
              <div className="entities-grid">
                {progress.entities.slice(0, 5).map((entity) => (
                  <div key={entity.id} className="entity-card">
                    <span className="entity-type">{entity.type}</span>
                    <span className="entity-value">{entity.value}</span>
                  </div>
                ))}
                {progress.entities.length > 5 && (
                  <div className="entity-card more">
                    +{progress.entities.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Terminal Status Message */}
      {isTerminal && (
        <div className={`terminal-status-banner status-${progress?.status}`}>
          <span className="banner-icon">
            {progress?.status === 'completed' && '✓'}
            {progress?.status === 'failed' && '✕'}
            {progress?.status === 'cancelled' && '⊘'}
          </span>
          <span className="banner-text">
            {progress?.status === 'completed' && 'Investigation completed successfully'}
            {progress?.status === 'failed' && 'Investigation failed'}
            {progress?.status === 'cancelled' && 'Investigation was cancelled'}
          </span>
        </div>
      )}
    </div>
  );
};

RealTimeProgressMonitor.displayName = 'RealTimeProgressMonitor';

