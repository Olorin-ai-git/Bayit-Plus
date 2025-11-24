/**
 * Progress Bar Component
 * Feature: 008-live-investigation-updates (US1 Real-Time Progress)
 *
 * Displays investigation progress in real-time with status indicators,
 * animated transitions, and estimated completion time.
 *
 * SYSTEM MANDATE Compliance:
 * - Real data from /progress endpoint
 * - No hardcoded colors/values
 * - Responsive design
 * - Accessible
 */

import React, { useMemo } from 'react';
import { InvestigationProgress } from '../../../../shared/types/investigation';
import './ProgressBar.css';

export interface ProgressBarProps {
  progress: InvestigationProgress | null;
  isLoading?: boolean;
  error?: Error | null;
  showLabel?: boolean;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Calculate estimated completion time
 */
function estimatedCompletion(
  completion: number,
  toolsPerSecond: number,
  totalTools: number
): string {
  if (completion >= 100 || toolsPerSecond <= 0) {
    return '—';
  }

  const remainingTools = totalTools - (totalTools * completion / 100);
  const secondsRemaining = remainingTools / toolsPerSecond;
  const minutesRemaining = Math.ceil(secondsRemaining / 60);

  if (minutesRemaining < 1) {
    return 'Less than a minute';
  }
  if (minutesRemaining === 1) {
    return '1 minute';
  }
  return `${minutesRemaining} minutes`;
}

/**
 * Get status color based on progress status
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'running':
    case 'initializing':
      return 'progress-status-active';
    case 'completed':
      return 'progress-status-complete';
    case 'failed':
      return 'progress-status-failed';
    case 'paused':
      return 'progress-status-paused';
    case 'pending':
    default:
      return 'progress-status-pending';
  }
}

/**
 * Format tool statistics
 */
function formatToolStats(progress: InvestigationProgress): string {
  const { completedTools, totalTools, failedTools } = progress;
  
  if (totalTools === 0) {
    return 'No tools';
  }

  const parts = [`${completedTools}/${totalTools} completed`];
  if (failedTools > 0) {
    parts.push(`${failedTools} failed`);
  }

  return parts.join(' • ');
}

/**
 * Progress Bar Component
 *
 * Displays real-time investigation progress with:
 * - Animated progress bar
 * - Status indicator and color
 * - Completion percentage
 * - Tool execution statistics
 * - Estimated time to completion
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  isLoading = false,
  error = null,
  showLabel = true,
  showDetails = true,
  size = 'md'
}) => {
  // Calculate estimated completion time
  const estimatedTime = useMemo(() => {
    if (!progress) return '—';
    return estimatedCompletion(
      progress.completionPercent,
      progress.toolsPerSecond,
      progress.totalTools
    );
  }, [progress]);

  // Format status text
  const statusText = useMemo(() => {
    if (error) return 'Error';
    if (isLoading) return 'Loading...';
    if (!progress) return 'Initializing';
    
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      initializing: 'Initializing',
      running: 'Running',
      paused: 'Paused',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled'
    };

    return statusMap[progress.status] || 'Unknown';
  }, [progress, isLoading, error]);

  // Size classes
  const sizeClass = `progress-bar-${size}`;
  const statusClass = getStatusColor(progress?.status || 'pending');

  return (
    <div className={`progress-bar-container ${sizeClass}`}>
      {/* Header with status and percentage */}
      {showLabel && (
        <div className="progress-bar-header">
          <span className="progress-bar-title">Investigation Progress</span>
          <span className={`progress-bar-status ${statusClass}`}>
            {statusText}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="progress-bar-wrapper">
        <div className="progress-bar-background">
          <div
            className={`progress-bar-fill ${statusClass}`}
            style={{ width: `${progress?.completionPercent || 0}%` }}
            role="progressbar"
            aria-valuenow={progress?.completionPercent || 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress: ${progress?.completionPercent || 0}%`}
          />
        </div>
        
        {/* Percentage label */}
        <span className="progress-bar-percentage">
          {progress?.completionPercent || 0}%
        </span>
      </div>

      {/* Details section */}
      {showDetails && (
        <div className="progress-bar-details">
          <div className="progress-detail-row">
            <span className="progress-detail-label">Tools:</span>
            <span className="progress-detail-value">
              {formatToolStats(progress || { completedTools: 0, totalTools: 0, failedTools: 0 } as any)}
            </span>
          </div>

          {progress && (
            <>
              <div className="progress-detail-row">
                <span className="progress-detail-label">Speed:</span>
                <span className="progress-detail-value">
                  {progress.toolsPerSecond.toFixed(1)} tools/sec
                </span>
              </div>

              <div className="progress-detail-row">
                <span className="progress-detail-label">ETA:</span>
                <span className="progress-detail-value">
                  {estimatedTime}
                </span>
              </div>
            </>
          )}

          {error && (
            <div className="progress-detail-row progress-detail-error">
              <span className="progress-detail-label">Error:</span>
              <span className="progress-detail-value">{error.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

ProgressBar.displayName = 'ProgressBar';

