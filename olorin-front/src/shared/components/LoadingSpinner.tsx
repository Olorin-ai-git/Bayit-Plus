<<<<<<< HEAD
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white' | 'green' | 'red' | 'yellow';
  className?: string;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  className = '',
  message
=======
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
>>>>>>> 001-modify-analyzer-method
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

<<<<<<< HEAD
  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
=======
  const spinnerElement = (
    <div className="flex flex-col items-center gap-3">
      <svg
        className={`animate-spin ${sizeClasses[size]} text-corporate-accentPrimary`}
>>>>>>> 001-modify-analyzer-method
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
<<<<<<< HEAD
=======
          fill="none"
>>>>>>> 001-modify-analyzer-method
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      {message && (
<<<<<<< HEAD
        <p className={`mt-2 text-sm ${colorClasses[color]} text-center`}>
          {message}
        </p>
      )}
    </div>
  );
};

=======
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

>>>>>>> 001-modify-analyzer-method
export default LoadingSpinner;