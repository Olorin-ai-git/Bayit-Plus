/**
 * Spinner Component
 *
 * Loading spinner with Olorin corporate styling.
 * Follows design system colors and animation patterns.
 */

import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
}

/**
 * Spinner size mapping
 */
const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
  xl: 'w-16 h-16 border-4'
};

/**
 * Spinner variant colors (Olorin corporate palette)
 */
const variantClasses = {
  primary: 'border-corporate-accentPrimary border-t-transparent',
  secondary: 'border-corporate-accentSecondary border-t-transparent',
  white: 'border-white border-t-transparent'
};

/**
 * Spinner component for loading states
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className = ''
}) => {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-full
        animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Full page loading overlay
 */
export interface LoadingOverlayProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  size = 'lg'
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-corporate-bgPrimary/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size={size} variant="primary" />
        {message && (
          <p className="text-corporate-textSecondary text-lg font-medium">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Inline loading state
 */
export interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message,
  size = 'md',
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Spinner size={size} variant="primary" />
      {message && (
        <span className="text-corporate-textSecondary text-sm">
          {message}
        </span>
      )}
    </div>
  );
};
