/**
 * Progress Bar Component
 * Displays investigation progress with gradient styling
 */

import React from 'react';

interface ProgressBarProps {
  progress: number;
  className?: string;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
  showLabel = false
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-corporate-textSecondary">Progress</span>
          <span className="text-sm font-semibold text-corporate-accentPrimary">
            {clampedProgress}%
          </span>
        </div>
      )}
      <div className="h-2 bg-corporate-bgSecondary rounded-full overflow-hidden border border-corporate-borderPrimary/40">
        <div
          className="h-full bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary transition-all duration-300"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

