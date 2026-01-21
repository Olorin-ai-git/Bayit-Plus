/**
 * Monthly Analysis Progress Visualization
 * Feature: monthly-frontend-trigger
 *
 * Day-by-day progress visualization for monthly analysis.
 * Shows completion status for each day in the month.
 *
 * SYSTEM MANDATE Compliance:
 * - Tailwind CSS only
 * - No hardcoded values
 */

import React, { useMemo } from 'react';
import { DailyResultSummary } from '../../types/monthlyAnalysis';

export interface MonthlyAnalysisProgressProps {
  /** Year being analyzed */
  year: number;
  /** Month being analyzed */
  month: number;
  /** Current day being processed (if running) */
  currentDay?: number;
  /** Days completed so far */
  daysCompleted: number;
  /** Total days in the month */
  totalDays: number;
  /** Daily results (for completed days) */
  dailyResults?: DailyResultSummary[];
  /** Whether analysis is running */
  isRunning?: boolean;
}

type DayStatus = 'pending' | 'running' | 'completed' | 'error';

interface DayInfo {
  day: number;
  status: DayStatus;
  result?: DailyResultSummary;
}

/**
 * Get status color for a day
 */
function getDayStatusColor(status: DayStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500/80';
    case 'running':
      return 'bg-blue-500 animate-pulse';
    case 'error':
      return 'bg-red-500/80';
    case 'pending':
    default:
      return 'bg-white/10';
  }
}

/**
 * Progress visualization component
 */
export const MonthlyAnalysisProgress: React.FC<MonthlyAnalysisProgressProps> = ({
  year,
  month,
  currentDay,
  daysCompleted,
  totalDays,
  dailyResults = [],
  isRunning = false,
}) => {
  // Build day info array
  const days = useMemo<DayInfo[]>(() => {
    const resultMap = new Map(dailyResults.map(r => [r.day, r]));

    return Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const result = resultMap.get(day);

      let status: DayStatus = 'pending';
      if (result) {
        status = result.entitiesAnalyzed > 0 || result.investigationsCount > 0
          ? 'completed'
          : 'error';
      } else if (isRunning && day === currentDay) {
        status = 'running';
      }

      return { day, status, result };
    });
  }, [totalDays, currentDay, dailyResults, isRunning]);

  // Calculate month name
  const monthName = useMemo(() => {
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  }, [year, month]);

  // Group days by week for calendar view
  const weeks = useMemo(() => {
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    const result: (DayInfo | null)[][] = [];
    let currentWeek: (DayInfo | null)[] = Array(firstDayOfMonth).fill(null);

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      result.push(currentWeek);
    }

    return result;
  }, [year, month, days]);

  // Day of week headers
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {monthName} {year} Progress
        </h3>
        <span className="text-sm text-gray-400">
          {daysCompleted} of {totalDays} days completed
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {dayHeaders.map((header) => (
                <th
                  key={header}
                  className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider text-center"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.map((dayInfo, dayIndex) => (
                  <td key={dayIndex} className="p-1">
                    {dayInfo ? (
                      <div
                        className={`
                          relative w-10 h-10 rounded-lg flex items-center justify-center
                          transition-all cursor-pointer hover:scale-105
                          ${getDayStatusColor(dayInfo.status)}
                        `}
                        title={
                          dayInfo.result
                            ? `Day ${dayInfo.day}: ${dayInfo.result.investigationsCount} investigations`
                            : `Day ${dayInfo.day}`
                        }
                      >
                        <span className="text-sm font-medium text-white">
                          {dayInfo.day}
                        </span>
                        {dayInfo.status === 'running' && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-ping" />
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-10" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/80" />
          <span className="text-xs text-gray-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500 animate-pulse" />
          <span className="text-xs text-gray-400">Running</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white/10" />
          <span className="text-xs text-gray-400">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/80" />
          <span className="text-xs text-gray-400">Error</span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyAnalysisProgress;
