/**
 * Time Range Picker Component
 * Feature: 004-new-olorin-frontend
 *
 * Date/time range selection for investigation period.
 * Uses Olorin purple corporate colors with quick presets.
 */

import React, { useState, useEffect } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import type { TimeRange } from '@shared/types/wizard.types';

export interface TimeRangePickerProps {
  value: TimeRange | null;
  onChange: (range: TimeRange) => void;
  maxRangeDays?: number;
  className?: string;
}

// Window duration options in days
export const WINDOW_DURATION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' }
] as const;

/**
 * Time range picker with quick presets
 */
export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  value,
  onChange,
  maxRangeDays = 365,
  className = ''
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<number>(14);

  // Load initial values and detect preset
  useEffect(() => {
    if (value) {
      setStartDate(formatDateTimeLocal(value.startDate));
      setEndDate(formatDateTimeLocal(value.endDate));
      
      // Load window_days if present
      if (value.windowDays) {
        setWindowDays(value.windowDays);
      }

      // Detect which preset matches the current range
      // Calculate how many days ago the END date is (this is the "lookback period")
      const now = new Date();
      const endTime = new Date(value.endDate);
      const daysAgo = Math.round((now.getTime() - endTime.getTime()) / (1000 * 60 * 60 * 24));

      // Match to preset based on lookback days (with small tolerance for rounding)
      if (daysAgo <= 1) {
        setSelectedPreset('last24h');
      } else if (daysAgo >= 6 && daysAgo <= 8) {
        setSelectedPreset('last7d');
      } else if (daysAgo >= 28 && daysAgo <= 32) {
        setSelectedPreset('last30d');
      } else if (daysAgo >= 88 && daysAgo <= 92) {
        setSelectedPreset('last90d');
      } else if (daysAgo >= 118 && daysAgo <= 122) {
        setSelectedPreset('last120d');
      } else if (daysAgo >= 178 && daysAgo <= 182) {
        setSelectedPreset('last180d');
      } else if (daysAgo >= 363 && daysAgo <= 367) {
        setSelectedPreset('last365d');
      } else {
        setSelectedPreset(null);
      }
    }
  }, [value]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    setSelectedPreset(null); // Clear preset when manually changing
    validateAndEmit(newStart, endDate, null);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    setEndDate(newEnd);
    setSelectedPreset(null); // Clear preset when manually changing
    // Recalculate start date based on window duration
    if (newEnd) {
      const end = new Date(newEnd);
      const start = new Date(end);
      start.setDate(start.getDate() - windowDays);
      const newStartStr = formatDateTimeLocal(start.toISOString());
      setStartDate(newStartStr);
      validateAndEmit(newStartStr, newEnd, null);
    } else {
      validateAndEmit(startDate, newEnd, null);
    }
  };

  const validateAndEmit = (start: string, end: string, preset?: string | null) => {
    if (!start || !end) {
      setError('Both start and end dates are required');
      return;
    }

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const now = Date.now();

    if (startTime >= endTime) {
      setError('End date must be after start date');
      return;
    }

    // Cap end date at 6 months before current date (configurable via env)
    // Default to 6 months if not configured
    const maxLookbackMonths = parseInt(process.env.REACT_APP_ANALYTICS_MAX_LOOKBACK_MONTHS || '6', 10);
    const maxLookbackDays = maxLookbackMonths * 30;
    const maxAllowedEndTime = now - (maxLookbackDays * 24 * 60 * 60 * 1000);

    if (endTime > maxAllowedEndTime) {
      const maxAllowedDate = new Date(maxAllowedEndTime);
      setError(`End date cannot be later than ${maxLookbackMonths} months before today (${maxAllowedDate.toLocaleDateString()})`);
      return;
    }

    const rangeDays = (endTime - startTime) / (1000 * 60 * 60 * 24);
    if (rangeDays > maxRangeDays) {
      setError(`Maximum range is ${maxRangeDays} days`);
      return;
    }

    setError(null);

    // Determine the type based on preset or use 'custom'
    let type: string = 'custom';
    if (preset) {
      switch (preset) {
        case 'last24h':
          type = 'last_24h';
          break;
        case 'last7d':
          type = 'last_7d';
          break;
        case 'last30d':
          type = 'last_30d';
          break;
        case 'last90d':
          type = 'last_90d';
          break;
        case 'last120d':
          type = 'last_120d';
          break;
        case 'last180d':
          type = 'last_180d';
          break;
        case 'last365d':
          type = 'last_365d';
          break;
      }
    }

    onChange({
      type: type as any,
      startDate: new Date(start).toISOString(),
      endDate: new Date(end).toISOString(),
      windowDays: windowDays
    });
  };
  
  const handleWindowDaysChange = (days: number) => {
    setWindowDays(days);
    // Recalculate dates based on window duration
    // If endDate is set, calculate startDate = endDate - windowDays
    if (endDate) {
      const end = new Date(endDate);
      const start = new Date(end);
      start.setDate(start.getDate() - days);
      const newStartStr = formatDateTimeLocal(start.toISOString());
      setStartDate(newStartStr);
      validateAndEmit(newStartStr, endDate, selectedPreset);
    } else {
      // If no endDate, just update windowDays and emit with current dates
      validateAndEmit(startDate, endDate, selectedPreset);
    }
  };

  const applyPreset = (preset: 'last24h' | 'last7d' | 'last30d' | 'last90d' | 'last120d' | 'last180d' | 'last365d') => {
    let daysBack = 0;

    switch (preset) {
      case 'last24h':
        daysBack = 1;
        break;
      case 'last7d':
        daysBack = 7;
        break;
      case 'last30d':
        daysBack = 30;
        break;
      case 'last90d':
        daysBack = 90;
        break;
      case 'last120d':
        daysBack = 120;
        break;
      case 'last180d':
        daysBack = 180;
        break;
      case 'last365d':
        daysBack = 365;
        break;
    }

    // Calculate start date based on end date and window duration
    // End date is "daysBack" ago, start date is end date - windowDays
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - daysBack);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - windowDays);

    const startStr = formatDateTimeLocal(startDate.toISOString());
    const endStr = formatDateTimeLocal(endDate.toISOString());

    setStartDate(startStr);
    setEndDate(endStr);
    setSelectedPreset(preset); // Track selected preset
    validateAndEmit(startStr, endStr, preset);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Window Duration Selection */}
      <div>
        <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
          Investigation Window Duration
        </label>
        <div className="flex gap-3">
          {WINDOW_DURATION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                windowDays === option.value
                  ? 'bg-corporate-accentPrimary border-corporate-accentPrimary text-white'
                  : 'bg-black/40 backdrop-blur border-corporate-borderPrimary/40 text-corporate-textSecondary hover:border-corporate-accentPrimary hover:text-corporate-textPrimary'
              }`}
            >
              <input
                type="radio"
                name="windowDays"
                value={option.value}
                checked={windowDays === option.value}
                onChange={() => handleWindowDaysChange(option.value)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
          How Long Ago (Lookback Period)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <button
            type="button"
            onClick={() => applyPreset('last24h')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedPreset === 'last24h'
                ? 'bg-corporate-accentSecondary/20 border-2 border-corporate-accentSecondary text-corporate-accentSecondary font-semibold'
                : 'bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 text-corporate-textSecondary hover:border-corporate-accentSecondary hover:text-corporate-textPrimary'
            }`}
          >
            Last 24h
          </button>
          <button
            type="button"
            onClick={() => applyPreset('last7d')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedPreset === 'last7d'
                ? 'bg-corporate-accentSecondary/20 border-2 border-corporate-accentSecondary text-corporate-accentSecondary font-semibold'
                : 'bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 text-corporate-textSecondary hover:border-corporate-accentSecondary hover:text-corporate-textPrimary'
            }`}
          >
            Last 7d
          </button>
          <button
            type="button"
            onClick={() => applyPreset('last30d')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedPreset === 'last30d'
                ? 'bg-corporate-accentSecondary/20 border-2 border-corporate-accentSecondary text-corporate-accentSecondary font-semibold'
                : 'bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 text-corporate-textSecondary hover:border-corporate-accentSecondary hover:text-corporate-textPrimary'
            }`}
          >
            Last 30d
          </button>
          <button
            type="button"
            onClick={() => applyPreset('last90d')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedPreset === 'last90d'
                ? 'bg-corporate-accentSecondary/20 border-2 border-corporate-accentSecondary text-corporate-accentSecondary font-semibold'
                : 'bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 text-corporate-textSecondary hover:border-corporate-accentSecondary hover:text-corporate-textPrimary'
            }`}
          >
            Last 90d
          </button>
          <button
            type="button"
            onClick={() => applyPreset('last120d')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedPreset === 'last120d'
                ? 'bg-corporate-accentSecondary/20 border-2 border-corporate-accentSecondary text-corporate-accentSecondary font-semibold'
                : 'bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 text-corporate-textSecondary hover:border-corporate-accentSecondary hover:text-corporate-textPrimary'
            }`}
          >
            Last 120d
          </button>
          <button
            type="button"
            onClick={() => applyPreset('last180d')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedPreset === 'last180d'
                ? 'bg-corporate-accentSecondary/20 border-2 border-corporate-accentSecondary text-corporate-accentSecondary font-semibold'
                : 'bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 text-corporate-textSecondary hover:border-corporate-accentSecondary hover:text-corporate-textPrimary'
            }`}
          >
            Last 180d
          </button>
          <button
            type="button"
            onClick={() => applyPreset('last365d')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedPreset === 'last365d'
                ? 'bg-corporate-accentSecondary/20 border-2 border-corporate-accentSecondary text-corporate-accentSecondary font-semibold'
                : 'bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 text-corporate-textSecondary hover:border-corporate-accentSecondary hover:text-corporate-textPrimary'
            }`}
          >
            Last 365d
          </button>
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
            Start Date & Time
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={startDate}
              onChange={handleStartChange}
              className="w-full px-3 py-2 pl-10 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:outline-none focus:border-corporate-accentPrimary transition-colors"
            />
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-corporate-textTertiary pointer-events-none" />
          </div>
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
            End Date & Time
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={endDate}
              onChange={handleEndChange}
              className="w-full px-3 py-2 pl-10 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:outline-none focus:border-corporate-accentPrimary transition-colors"
            />
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-corporate-textTertiary pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-corporate-error">{error}</p>
      )}

      {/* Range Info */}
      {!error && startDate && endDate && (
        <p className="text-xs text-corporate-textTertiary">
          Range: {formatRangeDuration(startDate, endDate)}
        </p>
      )}
    </div>
  );
};

/**
 * Format ISO datetime to datetime-local input format
 */
function formatDateTimeLocal(isoString: string): string {
  if (!isoString) return '';

  const date = new Date(isoString);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('[TimeRangePicker] Invalid date string:', isoString);
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format range duration for display
 */
function formatRangeDuration(start: string, end: string): string {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const diffMs = endTime - startTime;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }
  return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
}

export default TimeRangePicker;
