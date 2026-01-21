/**
 * ErrorAlert Component
 *
 * A comprehensive error alert component with different severity levels,
 * actions, and accessibility features for consistent error handling.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { useCallback, useState } from 'react';

export interface ErrorAlertProps {
  /** Error title */
  title?: string;
  /** Error message */
  message: string;
  /** Error severity level */
  severity?: 'error' | 'warning' | 'info' | 'success';
  /** Error type for styling */
  type?: 'banner' | 'toast' | 'inline' | 'modal';
  /** Show error icon */
  showIcon?: boolean;
  /** Enable dismiss functionality */
  dismissible?: boolean;
  /** Auto dismiss after timeout (milliseconds) */
  autoDismiss?: number;
  /** Show retry action */
  showRetry?: boolean;
  /** Show details toggle */
  showDetails?: boolean;
  /** Detailed error information */
  details?: string | Record<string, unknown>;
  /** Error code */
  errorCode?: string;
  /** Timestamp of error */
  timestamp?: string;
  /** Custom action buttons */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  }>;
  /** Callback for dismiss */
  onDismiss?: () => void;
  /** Callback for retry */
  onRetry?: () => void;
  /** Custom styling classes */
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title,
  message,
  severity = 'error',
  type = 'inline',
  showIcon = true,
  dismissible = true,
  autoDismiss,
  showRetry = false,
  showDetails = false,
  details,
  errorCode,
  timestamp,
  actions = [],
  onDismiss,
  onRetry,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Auto dismiss functionality
  React.useEffect(() => {
    if (autoDismiss && autoDismiss > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismiss);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

  const toggleDetails = useCallback(() => {
    setDetailsExpanded(prev => !prev);
  }, []);

  if (!isVisible) return null;

  const getSeverityConfig = () => {
    switch (severity) {
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          titleColor: 'text-yellow-900',
          iconColor: 'text-yellow-600',
        };
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          titleColor: 'text-blue-900',
          iconColor: 'text-blue-600',
        };
      case 'success':
        return {
          icon: '✅',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          titleColor: 'text-green-900',
          iconColor: 'text-green-600',
        };
      default: // error
        return {
          icon: '❌',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          titleColor: 'text-red-900',
          iconColor: 'text-red-600',
        };
    }
  };

  const getTypeClasses = () => {
    switch (type) {
      case 'banner':
        return 'fixed top-0 left-0 right-0 z-50 border-b';
      case 'toast':
        return 'fixed top-4 right-4 z-50 max-w-sm shadow-lg';
      case 'modal':
        return 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
      default: // inline
        return 'relative';
    }
  };

  const config = getSeverityConfig();

  const formatDetails = () => {
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      return JSON.stringify(details, null, 2);
    }
    return String(details);
  };

  const formatTimestamp = () => {
    if (!timestamp) return null;
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const alertContent = (
    <div
      className={`error-alert border rounded-lg p-4 ${config.bgColor} ${config.borderColor} ${getTypeClasses()} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {showIcon && (
            <span className={`text-lg flex-shrink-0 ${config.iconColor}`} aria-hidden="true">
              {config.icon}
            </span>
          )}

          <div className="flex-1 min-w-0">
            {title && (
              <h3 className={`font-semibold ${config.titleColor} mb-1`}>
                {title}
              </h3>
            )}

            <p className={`${config.textColor} text-sm leading-relaxed`}>
              {message}
            </p>

            {/* Error metadata */}
            {(errorCode || timestamp) && (
              <div className="mt-2 flex items-center gap-4 text-xs opacity-75">
                {errorCode && (
                  <span className={config.textColor}>
                    Error Code: {errorCode}
                  </span>
                )}
                {timestamp && (
                  <span className={config.textColor}>
                    {formatTimestamp()}
                  </span>
                )}
              </div>
            )}

            {/* Action buttons */}
            {(actions.length > 0 || showRetry) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {showRetry && onRetry && (
                  <button
                    onClick={handleRetry}
                    className="px-3 py-1 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                  >
                    Retry
                  </button>
                )}

                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      action.variant === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : action.variant === 'secondary'
                        ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'text-gray-600 hover:text-gray-800 underline'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}

                {showDetails && details && (
                  <button
                    onClick={toggleDetails}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    {detailsExpanded ? 'Hide details' : 'Show details'}
                  </button>
                )}
              </div>
            )}

            {/* Expanded details */}
            {detailsExpanded && details && (
              <div className="mt-3 p-3 bg-white bg-opacity-50 rounded border">
                <h4 className={`text-sm font-medium ${config.titleColor} mb-2`}>
                  Error Details
                </h4>
                <pre className={`text-xs ${config.textColor} whitespace-pre-wrap overflow-auto max-h-32`}>
                  {formatDetails()}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 ml-3 p-1 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors ${config.textColor}`}
            aria-label="Dismiss alert"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  // Modal wrapper
  if (type === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="max-w-md w-full mx-4">
          {alertContent}
        </div>
      </div>
    );
  }

  return alertContent;
};

export default ErrorAlert;