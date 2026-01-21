/**
 * Tool Execution Card Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays execution status and results for individual investigation tools.
 * Expandable card with Olorin purple styling and status indicators.
 */

import React, { useState } from 'react';
import { ChevronDownIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from './LoadingSpinner';

export interface ToolExecution {
  toolId: string;
  toolName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  result?: any;
  error?: string;
}

export interface ToolExecutionCardProps {
  execution: ToolExecution;
  initiallyExpanded?: boolean;
  className?: string;
}

/**
 * Tool execution card with expandable details
 */
export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  execution,
  initiallyExpanded = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const hasDetails = execution.result || execution.error;
  const duration = execution.startTime && execution.endTime
    ? calculateDuration(execution.startTime, execution.endTime)
    : null;

  return (
    <div
      className={`bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg overflow-hidden ${className}`}
    >
      {/* Card Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={!hasDetails}
        className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
          hasDetails ? 'hover:bg-black/30 backdrop-blur cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Status Icon */}
          {execution.status === 'completed' ? (
            <CheckCircleIcon className="w-6 h-6 text-corporate-success flex-shrink-0" />
          ) : execution.status === 'failed' ? (
            <XCircleIcon className="w-6 h-6 text-corporate-error flex-shrink-0" />
          ) : execution.status === 'running' ? (
            <LoadingSpinner size="sm" />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-corporate-textTertiary flex-shrink-0" />
          )}

          {/* Tool Name and Status */}
          <div className="flex-1 text-left min-w-0">
            <h4 className="text-sm font-semibold text-corporate-textPrimary truncate">
              {execution.toolName}
            </h4>
            {duration && (
              <p className="text-xs text-corporate-textTertiary mt-0.5">
                Duration: {duration}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <span
            className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusBadge(
              execution.status
            )}`}
          >
            {execution.status}
          </span>
        </div>

        {/* Expand Icon */}
        {hasDetails && (
          <ChevronDownIcon
            className={`w-5 h-5 text-corporate-textSecondary transition-transform ml-3 flex-shrink-0 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && hasDetails && (
        <div className="px-4 py-3 border-t border-corporate-borderPrimary">
          {/* Error Message */}
          {execution.error && (
            <div className="bg-corporate-error/20 border border-corporate-error/50 rounded-lg p-3 mb-3">
              <h5 className="text-sm font-medium text-corporate-error mb-2">Error</h5>
              <p className="text-xs text-red-300 font-mono">{execution.error}</p>
            </div>
          )}

          {/* Result Data */}
          {execution.result && (
            <div className="bg-black/30 backdrop-blur rounded-lg p-3">
              <h5 className="text-sm font-medium text-corporate-textPrimary mb-2">Result</h5>
              <pre className="text-xs text-corporate-textSecondary font-mono overflow-x-auto">
                {JSON.stringify(execution.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Timing Info */}
          {execution.startTime && (
            <div className="mt-3 flex items-center gap-4 text-xs text-corporate-textTertiary">
              <span>Started: {formatTime(execution.startTime)}</span>
              {execution.endTime && <span>Ended: {formatTime(execution.endTime)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Get status badge styling
 */
function getStatusBadge(status: ToolExecution['status']): string {
  const badges: Record<ToolExecution['status'], string> = {
    pending: 'bg-gray-800/50 text-gray-400',
    running: 'bg-corporate-accentPrimary/20 text-corporate-accentPrimary',
    completed: 'bg-corporate-success/30 text-corporate-success',
    failed: 'bg-red-900/30 text-corporate-error'
  };
  return badges[status];
}

/**
 * Calculate duration between two timestamps
 */
function calculateDuration(start: string, end: string): string {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const diffMs = endTime - startTime;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  return `${diffMinutes}m ${seconds}s`;
}

/**
 * Format time for display
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString();
}

export default ToolExecutionCard;
