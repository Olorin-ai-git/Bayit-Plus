/**
 * LoadingSpinner Component
 * Feature: 004-new-olorin-frontend
 *
 * Consistent loading spinner with Olorin purple accent.
 * Used for async operations and page loading states.
 */

import React from 'react';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LoadingSpinnerProps {
  /** Spinner size */
  size?: LoadingSpinnerSize;
  /** Optional loading message */
  message?: string;
  /** Center the spinner vertically and horizontally */
  centered?: boolean;
}

/**
 * LoadingSpinner component
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  centered = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const spinnerElement = (
    <div className="flex flex-col items-center gap-3">
      <svg
        className={`animate-spin ${sizeClasses[size]} text-corporate-accentPrimary`}
        viewBox="0 0 24 24"
      >
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

      {message && (
        <span className="text-sm text-corporate-textSecondary animate-pulse">
          {message}
        </span>
      )}
    </div>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

// Named export for convenience
export { LoadingSpinner };

export default LoadingSpinner;