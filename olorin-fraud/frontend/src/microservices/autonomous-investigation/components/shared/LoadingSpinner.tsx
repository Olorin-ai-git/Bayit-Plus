/**
 * LoadingSpinner Component
 *
 * A flexible loading spinner component with multiple variants and sizes
 * for consistent loading states across the application.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React from 'react';

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'small' | 'medium' | 'large' | 'extra-large';
  /** Spinner variant */
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  /** Color theme */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
  /** Loading message */
  message?: string;
  /** Show message below spinner */
  showMessage?: boolean;
  /** Center the spinner in its container */
  centered?: boolean;
  /** Overlay mode (covers entire container) */
  overlay?: boolean;
  /** Custom styling classes */
  className?: string;
  /** Custom message styling classes */
  messageClassName?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  variant = 'spinner',
  color = 'primary',
  message = 'Loading...',
  showMessage = true,
  centered = false,
  overlay = false,
  className = '',
  messageClassName = '',
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'w-4 h-4';
      case 'large': return 'w-8 h-8';
      case 'extra-large': return 'w-12 h-12';
      default: return 'w-6 h-6';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'secondary': return 'text-gray-600';
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'neutral': return 'text-gray-400';
      default: return 'text-blue-600';
    }
  };

  const getMessageSizeClasses = () => {
    switch (size) {
      case 'small': return 'text-xs';
      case 'large': return 'text-base';
      case 'extra-large': return 'text-lg';
      default: return 'text-sm';
    }
  };

  const renderSpinner = () => {
    const baseClasses = `${getSizeClasses()} ${getColorClasses()}`;

    switch (variant) {
      case 'dots':
        return (
          <div className={`flex gap-1 ${baseClasses}`}>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        );

      case 'pulse':
        return (
          <div className={`${baseClasses} bg-current rounded-full animate-pulse`} />
        );

      case 'bars':
        return (
          <div className={`flex gap-1 items-end ${baseClasses}`}>
            <div className="w-1 bg-current animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
            <div className="w-1 bg-current animate-pulse" style={{ height: '80%', animationDelay: '150ms' }} />
            <div className="w-1 bg-current animate-pulse" style={{ height: '100%', animationDelay: '300ms' }} />
            <div className="w-1 bg-current animate-pulse" style={{ height: '80%', animationDelay: '450ms' }} />
            <div className="w-1 bg-current animate-pulse" style={{ height: '60%', animationDelay: '600ms' }} />
          </div>
        );

      default: // spinner
        return (
          <div
            className={`${baseClasses} animate-spin border-2 border-current border-t-transparent rounded-full`}
            role="status"
            aria-label="Loading"
          />
        );
    }
  };

  const content = (
    <div className={`loading-spinner flex flex-col items-center gap-2 ${className}`}>
      {renderSpinner()}
      {showMessage && message && (
        <span className={`text-gray-600 ${getMessageSizeClasses()} ${messageClassName}`}>
          {message}
        </span>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  if (centered) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;