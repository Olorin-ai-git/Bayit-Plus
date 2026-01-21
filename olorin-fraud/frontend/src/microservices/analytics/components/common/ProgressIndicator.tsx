/**
 * ProgressIndicator Component - Progress bar for async operations
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';

export interface ProgressIndicatorProps {
  progress?: number; // 0-100
  status?: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress = 0,
  status = 'idle',
  message,
  className = '',
}) => {
  const statusColors = {
    idle: 'bg-corporate-bgTertiary',
    running: 'bg-corporate-accentPrimary',
    success: 'bg-green-500',
    error: 'bg-red-500',
  };

  const statusMessages = {
    idle: 'Ready',
    running: 'Running...',
    success: 'Complete',
    error: 'Error',
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {message && (
        <div className="text-sm text-corporate-textSecondary">{message}</div>
      )}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-corporate-bgTertiary overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${statusColors[status]}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={statusMessages[status]}
          />
        </div>
        <span className="text-xs text-corporate-textTertiary min-w-[60px] text-right">
          {status === 'running' ? `${Math.round(progress)}%` : statusMessages[status]}
        </span>
      </div>
    </div>
  );
};

