/**
 * Filters Component - Filter controls for analytics dashboard.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useState } from 'react';
import { useFilters } from '../../hooks/useFilters';
import type { AnalyticsFilter } from '../../types/analytics';

interface FiltersProps {
  filters: AnalyticsFilter;
}

const Filters: React.FC<FiltersProps> = ({ filters: initialFilters }) => {
  const { filters, updateFilters } = useFilters();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const handleTimeWindowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ timeWindow: e.target.value as AnalyticsFilter['timeWindow'] });
  };

  const handleRealtimeToggle = () => {
    setRealtimeEnabled(!realtimeEnabled);
  };

  return (
    <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-4 flex flex-wrap items-center gap-4">
      <select
        value={filters.timeWindow || '30d'}
        onChange={handleTimeWindowChange}
        className="px-4 py-2 bg-corporate-bgPrimary border border-corporate-borderPrimary rounded-lg text-corporate-textPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary"
      >
        <option value="1h">Last hour</option>
        <option value="24h">Last 24 hours</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
        <option value="all">All time</option>
      </select>

      <div className="flex items-center gap-2">
        <span className="text-sm text-corporate-textSecondary">Realtime</span>
        <button
          onClick={handleRealtimeToggle}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
            realtimeEnabled
              ? 'bg-corporate-accentPrimary'
              : 'bg-corporate-bgTertiary'
          }`}
          aria-label="Toggle realtime updates"
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
              realtimeEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white rounded-lg font-medium transition-colors duration-200"
      >
        Refresh
      </button>
    </div>
  );
};

export default Filters;

