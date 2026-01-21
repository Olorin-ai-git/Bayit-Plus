import React from 'react';
import { ChartSize, CHART_SIZE_DIMENSIONS } from '../../types/chart.types';

interface ChartContainerProps {
  title: string;
  description?: string;
  size?: ChartSize;
  loading?: boolean;
  error?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartContainer({
  title,
  description,
  size = 'medium',
  loading = false,
  error,
  actions,
  children,
  className = ''
}: ChartContainerProps) {
  const dimensions = CHART_SIZE_DIMENSIONS[size];

  return (
    <div className={`chart-container bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-xl p-4 flex flex-col h-full shadow-lg ${className}`}>
      {/* Chart Header */}
      <div className="flex items-start justify-between mb-3 flex-shrink-0">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-corporate-textPrimary">{title}</h3>
          {description && (
            <p className="text-sm text-corporate-textSecondary mt-1">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 ml-4">
            {actions}
          </div>
        )}
      </div>

      {/* Chart Content */}
      <div
        className="chart-content relative flex-1 min-h-0"
        style={{
          width: size === 'full' ? '100%' : `${dimensions.width}px`,
          height: size === 'full' ? '100%' : `${dimensions.height}px`,
          maxWidth: '100%',
          maxHeight: '100%',
          minHeight: 0
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Loading chart...</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/10 border-2 border-red-500 rounded">
            <div className="text-center px-4">
              <svg className="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-300 font-medium">Chart Error</p>
              <p className="text-xs text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && children}
      </div>

      {/* Chart Footer (if needed for legends, stats, etc.) */}
      <div className="chart-footer mt-3 pt-3 border-t border-corporate-borderPrimary/40 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-corporate-textSecondary">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-corporate-accentPrimary animate-pulse"></div>
            Visualization Service
          </span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
