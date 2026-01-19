/**
 * Monthly Analysis History Table
 * Feature: monthly-frontend-trigger
 *
 * Displays paginated history of monthly analysis runs.
 * Supports filtering and navigation.
 *
 * SYSTEM MANDATE Compliance:
 * - Tailwind CSS only
 * - No hardcoded values
 */

import React, { useCallback } from 'react';
import {
  MonthlyAnalysisHistoryItem,
  MonthlyAnalysisRunStatus,
  getStatusColorClass,
  getStatusLabel,
} from '../../types/monthlyAnalysis';

export interface MonthlyAnalysisHistoryProps {
  /** History items to display */
  runs: MonthlyAnalysisHistoryItem[];
  /** Total count of runs */
  total: number;
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Whether more items available */
  hasMore: boolean;
  /** Whether loading */
  isLoading?: boolean;
  /** Callback to view a run's results */
  onViewRun?: (runId: string) => void;
  /** Callback to go to next page */
  onNextPage?: () => void;
  /** Callback to go to previous page */
  onPreviousPage?: () => void;
  /** Callback to change status filter */
  onFilterChange?: (status?: MonthlyAnalysisRunStatus) => void;
  /** Current filter value */
  currentFilter?: MonthlyAnalysisRunStatus;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * History table component
 */
export const MonthlyAnalysisHistory: React.FC<MonthlyAnalysisHistoryProps> = ({
  runs,
  total,
  page,
  pageSize,
  hasMore,
  isLoading = false,
  onViewRun,
  onNextPage,
  onPreviousPage,
  onFilterChange,
  currentFilter,
}) => {
  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFilterChange?.(value ? (value as MonthlyAnalysisRunStatus) : undefined);
    },
    [onFilterChange]
  );

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Analysis History</h3>

        {/* Status Filter */}
        <select
          value={currentFilter || ''}
          onChange={handleFilterChange}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5
                     text-sm text-white focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-black/20">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Entities
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Started
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No analysis runs found
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.runId} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {run.monthName} {run.year}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[150px]">
                      {run.runId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColorClass(
                        run.status
                      )} bg-white/5`}
                    >
                      {getStatusLabel(run.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {run.daysCompleted}/{run.totalDays} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {run.totalEntities.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {formatDate(run.startedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onViewRun?.(run.runId)}
                      className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {total > 0 ? (
            <>
              Showing {startIndex} to {endIndex} of {total} runs
            </>
          ) : (
            'No runs'
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onPreviousPage}
            disabled={page <= 1 || isLoading}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-sm rounded-lg
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={onNextPage}
            disabled={!hasMore || isLoading}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-sm rounded-lg
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyAnalysisHistory;
