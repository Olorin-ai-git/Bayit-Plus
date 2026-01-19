/**
 * Monthly Analysis Status Card
 * Feature: monthly-frontend-trigger
 *
 * Displays current status of a monthly analysis run.
 * Shows progress, timing, and action buttons.
 *
 * SYSTEM MANDATE Compliance:
 * - Tailwind CSS only
 * - No hardcoded values
 */

import React, { useMemo } from 'react';
import {
  MonthlyAnalysisStatus,
  getStatusColorClass,
  getStatusLabel,
  isTerminalStatus,
} from '../../types/monthlyAnalysis';

export interface MonthlyAnalysisStatusCardProps {
  /** Current status data */
  status: MonthlyAnalysisStatus;
  /** Callback to cancel the run */
  onCancel?: (runId: string) => void;
  /** Whether cancel is in progress */
  isCancelling?: boolean;
  /** Callback to view results */
  onViewResults?: (runId: string) => void;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Status card component
 */
export const MonthlyAnalysisStatusCard: React.FC<MonthlyAnalysisStatusCardProps> = ({
  status,
  onCancel,
  isCancelling = false,
  onViewResults,
}) => {
  const statusColor = useMemo(() => getStatusColorClass(status.status), [status.status]);
  const statusLabel = useMemo(() => getStatusLabel(status.status), [status.status]);
  const isTerminal = useMemo(() => isTerminalStatus(status.status), [status.status]);
  const duration = useMemo(
    () => formatDuration(status.startedAt, status.completedAt),
    [status.startedAt, status.completedAt]
  );

  return (
    <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {status.monthName} {status.year}
          </h3>
          <p className="text-sm text-gray-400">Run ID: {status.runId}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor} bg-white/5`}>
          {statusLabel}
        </span>
      </div>

      {/* Progress Bar (if running) */}
      {status.status === 'running' && status.progress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">
              Day {status.progress.currentDay} of {status.progress.totalDays}
            </span>
            <span className="text-purple-400">
              {status.progress.progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
              style={{ width: `${status.progress.progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {status.progress ? (
          <>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Days Done</p>
              <p className="text-xl font-bold text-white">
                {status.progress.daysCompleted}/{status.progress.totalDays}
              </p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Entities</p>
              <p className="text-xl font-bold text-white">
                {status.progress.entitiesProcessed.toLocaleString()}
              </p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Investigations</p>
              <p className="text-xl font-bold text-white">
                {status.progress.investigationsCreated.toLocaleString()}
              </p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
              <p className="text-xl font-bold text-white">{duration}</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
              <p className="text-xl font-bold text-white">{duration}</p>
            </div>
            {status.triggeredBy && (
              <div className="bg-black/20 rounded-lg p-3 col-span-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Triggered By</p>
                <p className="text-sm text-white truncate">{status.triggeredBy}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Message */}
      {status.errorMessage && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{status.errorMessage}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {status.status === 'running' && onCancel && (
          <button
            onClick={() => onCancel(status.runId)}
            disabled={isCancelling}
            className="flex-1 py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400
                       rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Run'}
          </button>
        )}

        {isTerminal && onViewResults && (
          <button
            onClick={() => onViewResults(status.runId)}
            className="flex-1 py-2 px-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400
                       rounded-lg transition-colors"
          >
            View Results
          </button>
        )}
      </div>

      {/* Timestamps */}
      <div className="mt-4 pt-4 border-t border-white/5 text-xs text-gray-500">
        <p>Started: {new Date(status.startedAt).toLocaleString()}</p>
        {status.completedAt && (
          <p>Completed: {new Date(status.completedAt).toLocaleString()}</p>
        )}
        <p>Last Updated: {new Date(status.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
};

export default MonthlyAnalysisStatusCard;
