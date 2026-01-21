import React, { useState } from 'react';
import { eventBus } from '@/shared/events/EventBus';

export interface TimelineFilterState {
  types: Array<'info' | 'warning' | 'critical' | 'success'>;
  severities: Array<'low' | 'medium' | 'high' | 'critical'>;
  dateRange?: {
    start?: string;
    end?: string;
  };
  searchQuery?: string;
}

interface TimelineFiltersProps {
  investigationId: string;
  initialFilters?: Partial<TimelineFilterState>;
  onFilterChange?: (filters: TimelineFilterState, resultCount: number) => void;
  resultCount?: number;
  className?: string;
}

export function TimelineFilters({
  investigationId,
  initialFilters = {},
  onFilterChange,
  resultCount = 0,
  className = ''
}: TimelineFiltersProps) {
  const [filters, setFilters] = useState<TimelineFilterState>({
    types: initialFilters.types || ['info', 'warning', 'critical', 'success'],
    severities: initialFilters.severities || ['low', 'medium', 'high', 'critical'],
    dateRange: initialFilters.dateRange,
    searchQuery: initialFilters.searchQuery
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const eventTypes: Array<{ value: 'info' | 'warning' | 'critical' | 'success'; label: string; color: string }> = [
    { value: 'info', label: 'Info', color: 'bg-blue-500' },
    { value: 'warning', label: 'Warning', color: 'bg-yellow-500' },
    { value: 'critical', label: 'Critical', color: 'bg-red-500' },
    { value: 'success', label: 'Success', color: 'bg-green-500' }
  ];

  const severityLevels: Array<{ value: 'low' | 'medium' | 'high' | 'critical'; label: string }> = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  function publishFilterChange(newFilters: TimelineFilterState) {
    eventBus.publish('visualization:timeline-filtered', {
      investigationId,
      filters: {
        types: newFilters.types,
        severities: newFilters.severities,
        dateRange: newFilters.dateRange,
        searchQuery: newFilters.searchQuery
      },
      resultCount
    });

    onFilterChange?.(newFilters, resultCount);
  }

  function handleTypeToggle(type: typeof eventTypes[number]['value']) {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];

    const newFilters = { ...filters, types: newTypes };
    setFilters(newFilters);
    publishFilterChange(newFilters);
  }

  function handleSeverityToggle(severity: typeof severityLevels[number]['value']) {
    const newSeverities = filters.severities.includes(severity)
      ? filters.severities.filter(s => s !== severity)
      : [...filters.severities, severity];

    const newFilters = { ...filters, severities: newSeverities };
    setFilters(newFilters);
    publishFilterChange(newFilters);
  }

  function handleDateRangeChange(field: 'start' | 'end', value: string) {
    const newDateRange = { ...filters.dateRange, [field]: value || undefined };
    const newFilters = { ...filters, dateRange: newDateRange };
    setFilters(newFilters);
    publishFilterChange(newFilters);
  }

  function handleClearFilters() {
    const clearedFilters: TimelineFilterState = {
      types: ['info', 'warning', 'critical', 'success'],
      severities: ['low', 'medium', 'high', 'critical'],
      dateRange: undefined,
      searchQuery: undefined
    };
    setFilters(clearedFilters);
    publishFilterChange(clearedFilters);
  }

  const hasActiveFilters =
    filters.types.length < 4 ||
    filters.severities.length < 4 ||
    filters.dateRange?.start ||
    filters.dateRange?.end ||
    filters.searchQuery;

  return (
    <div className={`timeline-filters ${className}`}>
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/70 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="text-sm font-semibold text-gray-200">Filters</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-600 text-white">Active</span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filter Controls */}
        {isExpanded && (
          <div className="px-4 py-3 space-y-4 border-t border-gray-700">
            {/* Event Types */}
            <div>
              <div className="text-xs font-medium text-gray-400 mb-2">Event Types</div>
              <div className="flex flex-wrap gap-2">
                {eventTypes.map(type => (
                  <label key={type.value} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.types.includes(type.value)}
                      onChange={() => handleTypeToggle(type.value)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-900"
                    />
                    <span className={`w-3 h-3 rounded-full ${type.color}`} />
                    <span className="text-sm text-gray-300 group-hover:text-gray-100">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Severity Levels */}
            <div>
              <div className="text-xs font-medium text-gray-400 mb-2">Severity Levels</div>
              <div className="flex flex-wrap gap-2">
                {severityLevels.map(level => (
                  <label key={level.value} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.severities.includes(level.value)}
                      onChange={() => handleSeverityToggle(level.value)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-gray-100 capitalize">{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <div className="text-xs font-medium text-gray-400 mb-2">Date Range</div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="datetime-local"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-md text-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="Start date"
                />
                <input
                  type="datetime-local"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-md text-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="End date"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="w-full px-3 py-2 text-sm font-medium text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 border border-orange-600/30 rounded-md transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
