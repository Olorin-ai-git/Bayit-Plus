/**
 * Phase Progress Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays progress for individual investigation phases.
 * Shows animated progress indicators with Olorin purple accent.
 */

import React from 'react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ProgressBar } from './ProgressBar';

export interface Phase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
}

export interface PhaseProgressProps {
  phases: Phase[];
  currentPhaseId?: string | null;
  className?: string;
}

/**
 * Phase progress display with status indicators
 */
export const PhaseProgress: React.FC<PhaseProgressProps> = ({
  phases,
  currentPhaseId,
  className = ''
}) => {
  if (phases.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-sm text-corporate-textTertiary">No phases available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {phases.map((phase, index) => {
        const isActive = phase.id === currentPhaseId;

        return (
          <div
            key={phase.id}
            className={`bg-black/40 backdrop-blur-md border-2 rounded-lg p-5 transition-all shadow-lg ${
              isActive
                ? 'border-corporate-accentPrimary shadow-corporate-accentPrimary/30'
                : 'border-corporate-accentPrimary/40 hover:border-corporate-accentPrimary/60'
            }`}
          >
            {/* Phase Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                {/* Status Icon */}
                <div className="pt-0.5">
                  {phase.status === 'completed' ? (
                    <CheckCircleIcon className="w-6 h-6 text-corporate-success" />
                  ) : phase.status === 'failed' ? (
                    <div className="w-6 h-6 rounded-full bg-corporate-error/20 border-2 border-corporate-error flex items-center justify-center">
                      <span className="text-corporate-error text-sm font-bold">!</span>
                    </div>
                  ) : phase.status === 'running' ? (
                    <div className="w-6 h-6 rounded-full border-2 border-corporate-accentPrimary border-t-transparent animate-spin shadow-lg shadow-corporate-accentPrimary/50" />
                  ) : (
                    <ClockIcon className="w-6 h-6 text-corporate-textTertiary" />
                  )}
                </div>

                {/* Phase Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-corporate-textPrimary">
                    {phase.name}
                  </h4>
                  <p className="text-sm text-corporate-textSecondary mt-1">
                    {phase.description}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${getStatusBadge(
                  phase.status
                )}`}
              >
                {phase.status === 'running' ? 'In Progress' : phase.status === 'pending' ? 'Pending' : phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}
              </span>
            </div>

            {/* Progress Bar */}
            {(phase.status === 'running' || phase.status === 'completed') && (
              <ProgressBar
                progress={phase.progress}
                variant={phase.status === 'completed' ? 'success' : 'primary'}
                showPercentage={true}
                className="mb-3"
              />
            )}

            {/* Timing Info */}
            {(phase.startTime || phase.endTime) && (
              <div className="flex items-center gap-4 text-xs text-corporate-textTertiary">
                {phase.startTime && (
                  <span>Started: {formatTime(phase.startTime)}</span>
                )}
                {phase.endTime && <span>Ended: {formatTime(phase.endTime)}</span>}
                {phase.startTime && phase.endTime && (
                  <span>Duration: {calculateDuration(phase.startTime, phase.endTime)}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Get status badge styling
 */
function getStatusBadge(status: Phase['status']): string {
  const badges: Record<Phase['status'], string> = {
    pending: 'bg-corporate-borderPrimary/20 text-corporate-textSecondary border-2 border-corporate-borderPrimary/40',
    running: 'bg-corporate-accentPrimary/20 text-corporate-accentPrimary border-2 border-corporate-accentPrimary',
    completed: 'bg-corporate-success/20 text-corporate-success border-2 border-corporate-success',
    failed: 'bg-corporate-error/20 text-corporate-error border-2 border-corporate-error'
  };
  return badges[status];
}

/**
 * Format time for display
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString();
}

/**
 * Calculate duration between two timestamps
 */
function calculateDuration(start: string, end: string): string {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const diffMs = endTime - startTime;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes > 0) {
    const seconds = diffSeconds % 60;
    return `${diffMinutes}m ${seconds}s`;
  }
  return `${diffSeconds}s`;
}

export default PhaseProgress;
