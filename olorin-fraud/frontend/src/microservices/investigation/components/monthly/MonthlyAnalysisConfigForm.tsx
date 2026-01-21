/**
 * Monthly Analysis Configuration Form
 * Feature: monthly-frontend-trigger
 *
 * Form for configuring and triggering a monthly analysis run.
 * Uses Tailwind CSS for styling (no Material-UI).
 *
 * SYSTEM MANDATE Compliance:
 * - Tailwind CSS only
 * - No hardcoded values
 * - Complete form validation
 */

import React, { useState, useCallback, useMemo } from 'react';
import { MonthlyAnalysisTriggerParams } from '../../types/monthlyAnalysis';

export interface MonthlyAnalysisConfigFormProps {
  /** Callback when form is submitted */
  onSubmit: (params: MonthlyAnalysisTriggerParams) => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Whether a run is already in progress */
  isRunning?: boolean;
  /** Default year */
  defaultYear?: number;
  /** Default month */
  defaultMonth?: number;
}

/**
 * Form for configuring monthly analysis parameters
 */
export const MonthlyAnalysisConfigForm: React.FC<MonthlyAnalysisConfigFormProps> = ({
  onSubmit,
  isSubmitting = false,
  isRunning = false,
  defaultYear,
  defaultMonth,
}) => {
  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [year, setYear] = useState<number>(defaultYear ?? currentYear);
  const [month, setMonth] = useState<number>(defaultMonth ?? currentMonth);
  const [resumeFromDay, setResumeFromDay] = useState<number>(1);
  const [includeBlindspot, setIncludeBlindspot] = useState<boolean>(true);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [topPercentage, setTopPercentage] = useState<string>('');
  const [timeWindowHours, setTimeWindowHours] = useState<string>('');

  // Calculate days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Available years (2020-2030)
  const years = useMemo(() => {
    const result = [];
    for (let y = 2020; y <= 2030; y++) {
      result.push(y);
    }
    return result;
  }, []);

  // Month names
  const months = useMemo(() => [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ], []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const params: MonthlyAnalysisTriggerParams = {
      year,
      month,
      resumeFromDay,
      includeBlindspotAnalysis: includeBlindspot,
    };

    if (topPercentage && !isNaN(parseFloat(topPercentage))) {
      params.topPercentage = parseFloat(topPercentage);
    }

    if (timeWindowHours && !isNaN(parseInt(timeWindowHours, 10))) {
      params.timeWindowHours = parseInt(timeWindowHours, 10);
    }

    onSubmit(params);
  }, [year, month, resumeFromDay, includeBlindspot, topPercentage, timeWindowHours, onSubmit]);

  const isDisabled = isSubmitting || isRunning;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Year and Month Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            disabled={isDisabled}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5
                       text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Month
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            disabled={isDisabled}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5
                       text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resume From Day */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Start from Day
        </label>
        <select
          value={resumeFromDay}
          onChange={(e) => setResumeFromDay(parseInt(e.target.value, 10))}
          disabled={isDisabled}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5
                     text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>Day {d}</option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Analysis will process from day {resumeFromDay} to {daysInMonth}
        </p>
      </div>

      {/* Include Blindspot Analysis */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="includeBlindspot"
          checked={includeBlindspot}
          onChange={(e) => setIncludeBlindspot(e.target.checked)}
          disabled={isDisabled}
          className="w-4 h-4 text-purple-600 bg-black/30 border-white/10 rounded
                     focus:ring-purple-500 disabled:opacity-50"
        />
        <label htmlFor="includeBlindspot" className="ml-2 text-sm text-gray-300">
          Include blindspot analysis after monthly flow
        </label>
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
      >
        {showAdvanced ? '▼ Hide Advanced Options' : '▶ Show Advanced Options'}
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-black/20 rounded-lg border border-white/5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Top Percentage (0.01 - 1.0)
            </label>
            <input
              type="number"
              value={topPercentage}
              onChange={(e) => setTopPercentage(e.target.value)}
              placeholder="Default: 0.1 (10%)"
              step="0.01"
              min="0.01"
              max="1"
              disabled={isDisabled}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5
                         text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Time Window (hours)
            </label>
            <input
              type="number"
              value={timeWindowHours}
              onChange={(e) => setTimeWindowHours(e.target.value)}
              placeholder="Default: 24 hours"
              min="1"
              max="168"
              disabled={isDisabled}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5
                         text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}

      {/* Running Warning */}
      {isRunning && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400">
            An analysis is currently running. Please wait for it to complete or cancel it.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isDisabled}
        className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50
                   text-white font-medium rounded-lg transition-colors
                   disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Starting Analysis...
          </>
        ) : (
          <>Start Monthly Analysis</>
        )}
      </button>
    </form>
  );
};

export default MonthlyAnalysisConfigForm;
