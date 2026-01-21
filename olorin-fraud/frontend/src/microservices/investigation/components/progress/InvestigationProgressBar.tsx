/**
 * Investigation Progress Bar
 * Feature: 006-hybrid-graph-integration
 *
 * Displays investigation progress (0-100%) with estimated completion time.
 * Shows visual progress indicator and completion estimates.
 */

import React from 'react';

interface InvestigationProgressBarProps {
  progressPercentage: number; // 0-100
  estimatedCompletionTime?: string; // ISO 8601 datetime
  status: string;
  className?: string;
}

export function InvestigationProgressBar({
  progressPercentage,
  estimatedCompletionTime,
  status,
  className = '',
}: InvestigationProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progressPercentage));

  const getProgressColor = () => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'failed') return 'bg-red-500';
    if (clampedProgress < 25) return 'bg-blue-500';
    if (clampedProgress < 75) return 'bg-cyan-500';
    return 'bg-green-500';
  };

  const formatEstimatedTime = (isoTime: string): string => {
    try {
      const targetTime = new Date(isoTime);
      const now = new Date();
      const diffMs = targetTime.getTime() - now.getTime();

      if (diffMs <= 0) return 'Completing soon';

      const diffMinutes = Math.floor(diffMs / 60000);
      const diffSeconds = Math.floor((diffMs % 60000) / 1000);

      if (diffMinutes > 0) {
        return `~${diffMinutes} min${diffMinutes !== 1 ? 's' : ''} remaining`;
      }
      return `~${diffSeconds} sec${diffSeconds !== 1 ? 's' : ''} remaining`;
    } catch {
      return 'Calculating...';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'running':
        return 'Running';
      default:
        return 'In Progress';
    }
  };

  return (
    <div className={`bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-corporate-textPrimary">
          Investigation Progress
        </h3>
        <span className="text-sm font-medium text-corporate-textSecondary">
          {getStatusLabel()}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-corporate-accentPrimary">
            {clampedProgress.toFixed(0)}%
          </span>
          {estimatedCompletionTime && status === 'running' && (
            <span className="text-sm text-corporate-textTertiary">
              {formatEstimatedTime(estimatedCompletionTime)}
            </span>
          )}
        </div>

        <div className="relative w-full h-3 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40/30 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${getProgressColor()}`}
            style={{ width: `${clampedProgress}%` }}
          >
            {/* Animated shine effect for running investigations */}
            {status === 'running' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
        </div>
      </div>

      {/* Progress milestones */}
      <div className="flex justify-between text-xs text-corporate-textTertiary">
        <span>Start</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>Complete</span>
      </div>
    </div>
  );
}
