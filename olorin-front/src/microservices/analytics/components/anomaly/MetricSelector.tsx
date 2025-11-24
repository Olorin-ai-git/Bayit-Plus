/**
 * MetricSelector Component - Dropdown for selecting metrics
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';

export interface MetricSelectorProps {
  value: string;
  onChange: (metric: string) => void;
  options?: string[];
  className?: string;
  disabled?: boolean;
}

const DEFAULT_METRICS = ['tx_count', 'amount_mean', 'decline_rate'];

export const MetricSelector: React.FC<MetricSelectorProps> = ({
  value,
  onChange,
  options = DEFAULT_METRICS,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label
        className="text-sm font-medium text-corporate-textPrimary"
        htmlFor="metric-selector"
      >
        Metric
      </label>
      <select
        id="metric-selector"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 rounded-lg
          bg-corporate-bgSecondary border border-corporate-borderPrimary
          text-corporate-textPrimary text-sm
          focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        aria-label="Select metric"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

