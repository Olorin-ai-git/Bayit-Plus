/**
 * API Error Handler Hook
 * Feature: 004-new-olorin-frontend
 *
 * Centralized error handling for all API calls with user-friendly notifications.
 * Ensures consistent error messaging across the application.
 */

import { useCallback } from 'react';
import { eventBus } from '@shared/events/UnifiedEventBus';
import { WizardStateError } from '@shared/services/wizardStateService.errors';

export interface ApiErrorOptions {
  /**
   * Contextual title for the error notification.
   * Examples: 'Failed to Load Tools', 'Failed to Start Investigation'
   */
  context: string;

  /**
   * Whether to auto-dismiss the notification after duration.
   * Default: false (errors persist until manually dismissed)
   */
  autoDismiss?: boolean;

  /**
   * Duration in ms before auto-dismiss (if autoDismiss is true).
   * Default: 5000ms
   */
  duration?: number;

  /**
   * Optional callback to execute after showing the notification.
   */
  onError?: (error: Error) => void;
}

/**
 * Hook for handling API errors with user-friendly notifications
 */
export function useApiErrorHandler() {
  /**
   * Show user-friendly error notification based on error type
   */
  const showErrorNotification = useCallback((error: Error, options: ApiErrorOptions) => {
    let errorTitle = options.context;
    let errorDescription = 'An unexpected error occurred. Please try again.';

    // Handle WizardStateError (from backend API calls)
    if (error instanceof WizardStateError) {
      switch (error.code) {
        case 'NETWORK_ERROR':
          errorDescription = 'Unable to reach the server. Please check your connection and try again.';
          break;
        case 'VALIDATION_ERROR':
          errorDescription = 'Invalid data provided. Please review your configuration.';
          // Check for specific validation errors
          if (error.message.includes('tool')) {
            errorDescription = 'Please select at least one tool to proceed with the investigation.';
          } else if (error.message.includes('entity')) {
            errorDescription = 'Please add at least one entity or enable auto-select mode.';
          } else if (error.message.includes('time')) {
            errorDescription = 'Please select a valid time range for the investigation.';
          }
          break;
        case 'VERSION_CONFLICT':
          errorDescription = 'The investigation was modified elsewhere. Please refresh and try again.';
          break;
        case 'DUPLICATE_INVESTIGATION':
          errorDescription = 'An investigation with these settings already exists.';
          break;
        case 'NOT_FOUND':
          errorDescription = 'The requested resource was not found.';
          break;
        case 'UNAUTHORIZED':
          errorDescription = 'You are not authorized to perform this action. Please log in again.';
          break;
        case 'RATE_LIMIT':
          errorDescription = 'Too many requests. Please wait a moment and try again.';
          break;
        default:
          if (error.statusCode && error.statusCode >= 500) {
            errorDescription = 'Server error occurred. Our team has been notified.';
          }
          break;
      }
    }
    // Handle generic errors (network, timeout, etc.)
    else if (error instanceof Error) {
      if (error.message.includes('Network') || error.message.includes('fetch')) {
        errorDescription = 'Unable to reach the server. Please check your connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorDescription = 'The request took too long to complete. Please try again.';
      } else if (error.message.includes('CORS')) {
        errorDescription = 'Server configuration issue. Please contact support.';
      } else if (error.message.includes('tool')) {
        errorDescription = 'Please select at least one tool from the Tools Configuration panel.';
      } else if (error.message.includes('entity')) {
        errorDescription = 'Please add at least one entity or enable auto-select mode in the Entity Selection panel.';
      } else if (error.message.includes('time') || error.message.includes('range')) {
        errorDescription = 'Please select a valid time range for the investigation.';
      }
    }

    // Emit error notification
    eventBus.emit('ui:notification:show', {
      notification: {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'error',
        title: errorTitle,
        message: errorDescription,
        duration: options.autoDismiss ? (options.duration || 5000) : 0 // 0 means don't auto-dismiss
      }
    });

    // Execute optional callback
    if (options.onError) {
      options.onError(error);
    }
  }, []);

  /**
   * Wrap an async function with automatic error notification handling
   */
  const withErrorHandling = useCallback(
    <T,>(asyncFn: () => Promise<T>, options: ApiErrorOptions): Promise<T> => {
      return asyncFn().catch((error) => {
        showErrorNotification(error, options);
        throw error; // Re-throw to allow caller to handle if needed
      });
    },
    [showErrorNotification]
  );

  return {
    showErrorNotification,
    withErrorHandling
  };
}
