/**
 * Progress Bar Component
 * Feature: 004-new-olorin-frontend
 *
 * Animated progress bar with glasmorphic styling and corporate colors.
 * Uses backdrop blur and transparent backgrounds for modern appearance.
 */

import React from 'react';

export type ProgressBarVariant = 'primary' | 'success' | 'warning' | 'error';

export interface ProgressBarProps {
  progress: number;
  variant?: ProgressBarVariant;
  showPercentage?: boolean;
  height?: string;
  animated?: boolean;
  className?: string;
}

/**
 * Progress bar with color variants and animation
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'primary',
  showPercentage = false,
  height = 'h-2',
  animated = true,
  className = ''
}) => {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={className}>
      {/* Progress Bar Container */}
      <div
        className={`w-full bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-full overflow-hidden ${height}`}
      >
        <div
          className={`${height} rounded-full transition-all duration-500 ease-out ${
            animated ? 'animate-pulse' : ''
          } ${getVariantColor(variant)}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      {/* Percentage Display */}
      {showPercentage && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-corporate-textTertiary">
            {clampedProgress.toFixed(0)}%
          </span>
          {clampedProgress === 100 && (
            <span className="text-xs text-corporate-success font-medium">Complete</span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Get color class based on variant
 */
function getVariantColor(variant: ProgressBarVariant): string {
  const colors: Record<ProgressBarVariant, string> = {
    primary: 'bg-corporate-accentPrimary',
    success: 'bg-corporate-success',
    warning: 'bg-corporate-warning',
    error: 'bg-corporate-error'
  };
  return colors[variant];
}

export default ProgressBar;
