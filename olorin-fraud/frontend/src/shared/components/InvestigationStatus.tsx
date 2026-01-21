/**
 * Investigation Status Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays overall investigation status with summary metrics.
 * Shows entity info, timing, and status with Olorin purple styling.
 */

import React from 'react';
import { ClockIcon, UserIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { InvestigationStatus as Status } from '@shared/types/wizard.types';

// Code loaded

export interface InvestigationStatusProps {
  investigationId: string;
  status: Status;
  entityCount: number;
  toolCount: number;
  startTime?: string;
  estimatedEndTime?: string;
  className?: string;
}

/**
 * Investigation status display with metrics
 */
export const InvestigationStatus: React.FC<InvestigationStatusProps> = ({
  investigationId,
  status,
  entityCount,
  toolCount,
  startTime,
  estimatedEndTime,
  className = ''
}) => {
  const timeElapsed = startTime ? calculateTimeElapsed(startTime) : null;
  const timeRemaining = estimatedEndTime ? calculateTimeRemaining(estimatedEndTime) : null;

  return (
    <div className={`bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary rounded-lg p-8 shadow-2xl shadow-corporate-accentPrimary/20 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-corporate-textPrimary mb-2">
            Investigation Progress
          </h2>
          <p className="text-sm text-corporate-textTertiary">
            ID: <span className="font-mono text-corporate-accentSecondary">{investigationId}</span>
          </p>
        </div>

        {/* Status Badge */}
        <span
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${getStatusBadge(
            status
          )}`}
        >
          {status === Status.COMPLETED ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : status === Status.FAILED ? (
            <XCircleIcon className="w-5 h-5" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          )}
          {status}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* Entities */}
        <div className="bg-black/30 backdrop-blur border-2 border-corporate-accentPrimary/40 rounded-xl p-6 hover:border-corporate-accentPrimary hover:bg-black/50 transition-all duration-300 shadow-lg shadow-corporate-accentPrimary/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-corporate-accentPrimary/20 rounded-lg">
              <UserIcon className="w-5 h-5 text-corporate-accentPrimary" />
            </div>
            <span className="text-xs font-semibold text-corporate-textSecondary uppercase tracking-wider">Entities</span>
          </div>
          <p className="text-4xl font-bold text-corporate-accentPrimary">{entityCount}</p>
        </div>

        {/* Tools */}
        <div className="bg-black/30 backdrop-blur border-2 border-corporate-accentPrimary/40 rounded-xl p-6 hover:border-corporate-accentPrimary hover:bg-black/50 transition-all duration-300 shadow-lg shadow-corporate-accentPrimary/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-corporate-accentPrimary/20 rounded-lg">
              <svg
                className="w-5 h-5 text-corporate-accentPrimary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </div>
            <span className="text-xs font-semibold text-corporate-textSecondary uppercase tracking-wider">Tools</span>
          </div>
          <p className="text-4xl font-bold text-corporate-accentPrimary">{toolCount}</p>
        </div>

        {/* Time Elapsed */}
        {timeElapsed && (
          <div className="bg-black/30 backdrop-blur border-2 border-corporate-accentPrimary/40 rounded-xl p-6 hover:border-corporate-accentPrimary hover:bg-black/50 transition-all duration-300 shadow-lg shadow-corporate-accentPrimary/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-corporate-accentPrimary/20 rounded-lg">
                <ClockIcon className="w-5 h-5 text-corporate-accentPrimary" />
              </div>
              <span className="text-xs font-semibold text-corporate-textSecondary uppercase tracking-wider">Elapsed</span>
            </div>
            <p className="text-4xl font-bold text-corporate-accentSecondary">{timeElapsed}</p>
          </div>
        )}

        {/* Time Remaining */}
        {timeRemaining && status === Status.RUNNING && (
          <div className="bg-black/30 backdrop-blur border-2 border-corporate-accentSecondary/40 rounded-xl p-6 hover:border-corporate-accentSecondary hover:bg-black/50 transition-all duration-300 shadow-lg shadow-corporate-accentSecondary/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-corporate-accentSecondary/20 rounded-lg">
                <ClockIcon className="w-5 h-5 text-corporate-accentSecondary" />
              </div>
              <span className="text-xs font-semibold text-corporate-textSecondary uppercase tracking-wider">Remaining</span>
            </div>
            <p className="text-4xl font-bold text-corporate-accentSecondary">{timeRemaining}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Get status badge styling
 */
function getStatusBadge(status: Status): string {
  const badges: Record<Status, string> = {
    [Status.PENDING]: 'bg-gray-800/50 text-gray-400 border border-gray-600',
    [Status.RUNNING]: 'bg-corporate-accentPrimary/20 text-corporate-accentPrimary border border-corporate-accentPrimary',
    [Status.COMPLETED]: 'bg-corporate-success/30 text-corporate-success border border-corporate-success',
    [Status.FAILED]: 'bg-red-900/30 text-corporate-error border border-corporate-error',
    [Status.CANCELLED]: 'bg-amber-900/30 text-amber-400 border border-amber-500'
  };
  return badges[status];
}

/**
 * Calculate time elapsed since start
 */
function calculateTimeElapsed(startTime: string): string {
  // Validate date string
  if (!startTime) {
    return '0s';
  }

  const start = new Date(startTime).getTime();

  // Check if date is valid
  if (isNaN(start)) {
    console.warn('[InvestigationStatus] Invalid start time:', startTime);
    return '0s';
  }

  const now = Date.now();
  const diffMs = now - start;

  // Handle negative elapsed time (startTime is in the future)
  if (diffMs < 0) {
    console.warn('[InvestigationStatus] Start time is in the future:', startTime);
    return '0s';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 1) {
    return `${diffSeconds}s`;
  }

  if (diffMinutes < 60) {
    const seconds = diffSeconds % 60;
    return `${diffMinutes}m ${seconds}s`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${diffHours}h ${minutes}m`;
}

/**
 * Calculate time remaining until estimated end
 */
function calculateTimeRemaining(estimatedEndTime: string): string {
  // Validate date string
  if (!estimatedEndTime) {
    return 'Calculating...';
  }

  const end = new Date(estimatedEndTime).getTime();

  // Check if date is valid
  if (isNaN(end)) {
    console.warn('[InvestigationStatus] Invalid end time:', estimatedEndTime);
    return 'Calculating...';
  }

  const now = Date.now();
  const diffMs = end - now;

  if (diffMs <= 0) {
    return 'Finalizing...';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 1) {
    return `${diffSeconds}s`;
  }

  if (diffMinutes < 60) {
    const seconds = diffSeconds % 60;
    return `${diffMinutes}m ${seconds}s`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${diffHours}h ${minutes}m`;
}

export default InvestigationStatus;
