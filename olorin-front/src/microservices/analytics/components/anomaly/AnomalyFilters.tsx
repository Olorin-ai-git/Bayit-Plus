/**
 * Anomaly Filters Component - Filter toolbar with URL sync
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';
import { Toolbar } from '../common/Toolbar';
import { useUrlState } from '../../hooks/useUrlState';
import type { AnomalySeverity, AnomalyStatus } from '../../types/anomaly';

export interface AnomalyFiltersProps {
  onFilterChange?: (filters: AnomalyFilterState) => void;
}

export interface AnomalyFilterState {
  severity?: AnomalySeverity[];
  metric?: string[];
  detector_id?: string;
  status?: AnomalyStatus[];
  window_start?: string;
  window_end?: string;
  min_score?: string;
  max_score?: string;
}

export const AnomalyFilters: React.FC<AnomalyFiltersProps> = ({
  onFilterChange,
}) => {
  const [filters, updateFilters] = useUrlState<AnomalyFilterState>({
    severity: undefined,
    metric: undefined,
    detector_id: undefined,
    status: undefined,
    window_start: undefined,
    window_end: undefined,
    min_score: undefined,
    max_score: undefined,
  });

  React.useEffect(() => {
    onFilterChange?.(filters);
  }, [filters, onFilterChange]);

  const handleSeverityChange = (severity: AnomalySeverity, checked: boolean) => {
    const current = filters.severity || [];
    const updated = checked
      ? [...current, severity]
      : current.filter((s) => s !== severity);
    updateFilters({ severity: updated.length > 0 ? updated : undefined });
  };

  const handleMetricChange = (metric: string, checked: boolean) => {
    const current = filters.metric || [];
    const updated = checked
      ? [...current, metric]
      : current.filter((m) => m !== metric);
    updateFilters({ metric: updated.length > 0 ? updated : undefined });
  };

  return (
    <Toolbar>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-corporate-textSecondary">Severity:</label>
          {(['critical', 'warn', 'info'] as AnomalySeverity[]).map((sev) => (
            <label
              key={sev}
              className="flex items-center gap-1 text-sm text-corporate-textPrimary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.severity?.includes(sev) || false}
                onChange={(e) => handleSeverityChange(sev, e.target.checked)}
                className="rounded border-corporate-borderPrimary"
                aria-label={`Filter by ${sev} severity`}
              />
              <span className="capitalize">{sev}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-corporate-textSecondary">Metric:</label>
          <select
            value={filters.metric?.[0] || ''}
            onChange={(e) =>
              updateFilters({
                metric: e.target.value ? [e.target.value] : undefined,
              })
            }
            className="px-3 py-1 rounded bg-corporate-bgSecondary border border-corporate-borderPrimary text-corporate-textPrimary text-sm"
            aria-label="Filter by metric"
          >
            <option value="">All</option>
            <option value="decline_rate">Decline Rate</option>
            <option value="tx_count">Transaction Count</option>
            <option value="amount_mean">Amount Mean</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-corporate-textSecondary">Time Range:</label>
          <input
            type="datetime-local"
            value={filters.window_start || ''}
            onChange={(e) => updateFilters({ window_start: e.target.value || undefined })}
            className="px-3 py-1 rounded bg-corporate-bgSecondary border border-corporate-borderPrimary text-corporate-textPrimary text-sm"
            aria-label="Filter start time"
          />
          <span className="text-corporate-textSecondary">to</span>
          <input
            type="datetime-local"
            value={filters.window_end || ''}
            onChange={(e) => updateFilters({ window_end: e.target.value || undefined })}
            className="px-3 py-1 rounded bg-corporate-bgSecondary border border-corporate-borderPrimary text-corporate-textPrimary text-sm"
            aria-label="Filter end time"
          />
        </div>

        <button
          type="button"
          onClick={() => updateFilters({})}
          className="px-3 py-1 rounded bg-corporate-bgSecondary hover:bg-corporate-bgTertiary text-corporate-textPrimary border border-corporate-borderPrimary text-sm transition-colors"
          aria-label="Clear all filters"
        >
          Clear Filters
        </button>
      </div>
    </Toolbar>
  );
};

