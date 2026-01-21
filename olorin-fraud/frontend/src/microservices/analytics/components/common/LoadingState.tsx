/**
 * Loading State Component for Analytics Microservice.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading analytics...',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div
        className={`${sizeClasses[size]} border-4 border-corporate-borderPrimary border-t-corporate-accentPrimary rounded-full animate-spin`}
        aria-hidden="true"
      />
      {message && (
        <p className={`mt-4 ${textSizeClasses[size]} text-corporate-textSecondary`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingState;

