/**
 * Error Handling & Offline Mode Utilities
 *
 * Features:
 * - Network error detection
 * - Retry mechanisms with exponential backoff
 * - Offline mode detection
 * - Error logging
 * - User-friendly error messages
 */

import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ttsService } from '@bayit/shared-services';
import i18n from '@bayit/shared-i18n';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorDetails {
  code: string;
  message: string;
  severity: ErrorSeverity;
  userMessage: string;
  canRetry: boolean;
  timestamp: number;
}

class ErrorHandler {
  private isOnline: boolean = true;
  private errorLog: ErrorDetails[] = [];
  private readonly MAX_LOG_SIZE = 100;

  /**
   * Initialize network state monitoring
   */
  initialize(): void {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOnline && !this.isOnline) {
        this.handleOffline();
      } else if (!wasOnline && this.isOnline) {
        this.handleOnline();
      }
    });

    // Check initial state
    NetInfo.fetch().then((state) => {
      this.isOnline = state.isConnected ?? false;
    });
  }

  /**
   * Check if device is online
   */
  isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  /**
   * Handle offline state
   */
  private handleOffline(): void {
    console.log('[ErrorHandler] Device went offline');

    Alert.alert(
      'No Internet Connection',
      'You are currently offline. Some features may not be available.',
      [{ text: 'OK' }]
    );

    // Announce to screen reader
    ttsService.speak('No internet connection. You are now in offline mode.').catch(() => {});
  }

  /**
   * Handle online state
   */
  private handleOnline(): void {
    console.log('[ErrorHandler] Device is back online');

    Alert.alert('Connection Restored', 'You are back online.', [{ text: 'OK' }]);

    // Announce to screen reader
    ttsService.speak('Internet connection restored.').catch(() => {});
  }

  /**
   * Log error
   */
  logError(error: ErrorDetails): void {
    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog.shift();
    }

    // Log to console
    console.error(`[ErrorHandler] ${error.severity.toUpperCase()}:`, error);
  }

  /**
   * Get error logs
   */
  getErrorLogs(): ErrorDetails[] {
    return [...this.errorLog];
  }

  /**
   * Clear error logs
   */
  clearErrorLogs(): void {
    this.errorLog = [];
  }

  /**
   * Handle API error
   */
  handleAPIError(error: any): ErrorDetails {
    let errorDetails: ErrorDetails;

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          errorDetails = {
            code: 'BAD_REQUEST',
            message: data?.message || 'Invalid request',
            severity: 'warning',
            userMessage: 'Something went wrong. Please try again.',
            canRetry: false,
            timestamp: Date.now(),
          };
          break;

        case 401:
          errorDetails = {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            severity: 'error',
            userMessage: 'Please log in to continue.',
            canRetry: false,
            timestamp: Date.now(),
          };
          break;

        case 403:
          errorDetails = {
            code: 'FORBIDDEN',
            message: 'Access denied',
            severity: 'error',
            userMessage: 'You do not have permission to access this content.',
            canRetry: false,
            timestamp: Date.now(),
          };
          break;

        case 404:
          errorDetails = {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            severity: 'warning',
            userMessage: 'The content you are looking for is not available.',
            canRetry: false,
            timestamp: Date.now(),
          };
          break;

        case 429:
          errorDetails = {
            code: 'RATE_LIMIT',
            message: 'Too many requests',
            severity: 'warning',
            userMessage: 'You are making too many requests. Please wait a moment.',
            canRetry: true,
            timestamp: Date.now(),
          };
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          errorDetails = {
            code: 'SERVER_ERROR',
            message: 'Server error',
            severity: 'error',
            userMessage: 'Our servers are having issues. Please try again later.',
            canRetry: true,
            timestamp: Date.now(),
          };
          break;

        default:
          errorDetails = {
            code: 'UNKNOWN_ERROR',
            message: data?.message || 'Unknown error occurred',
            severity: 'error',
            userMessage: 'Something went wrong. Please try again.',
            canRetry: true,
            timestamp: Date.now(),
          };
      }
    } else if (error.request) {
      // Request made but no response
      errorDetails = {
        code: 'NETWORK_ERROR',
        message: 'No response from server',
        severity: 'error',
        userMessage: this.isOnline
          ? 'Unable to connect to our servers. Please check your connection.'
          : 'You are offline. Please check your internet connection.',
        canRetry: true,
        timestamp: Date.now(),
      };
    } else {
      // Error setting up request
      errorDetails = {
        code: 'REQUEST_ERROR',
        message: error.message || 'Request failed',
        severity: 'error',
        userMessage: 'Something went wrong. Please try again.',
        canRetry: true,
        timestamp: Date.now(),
      };
    }

    this.logError(errorDetails);
    return errorDetails;
  }

  /**
   * Handle voice command error
   */
  handleVoiceError(error: any): ErrorDetails {
    let errorDetails: ErrorDetails;

    if (error.code === 'PERMISSION_DENIED') {
      errorDetails = {
        code: 'VOICE_PERMISSION_DENIED',
        message: 'Microphone permission denied',
        severity: 'error',
        userMessage:
          'Microphone access is required for voice commands. Please enable it in Settings.',
        canRetry: false,
        timestamp: Date.now(),
      };
    } else if (error.code === 'RECOGNITION_FAILED') {
      errorDetails = {
        code: 'VOICE_RECOGNITION_FAILED',
        message: 'Speech recognition failed',
        severity: 'warning',
        userMessage: "I didn't understand that. Please try again.",
        canRetry: true,
        timestamp: Date.now(),
      };
    } else {
      errorDetails = {
        code: 'VOICE_ERROR',
        message: error.message || 'Voice command failed',
        severity: 'warning',
        userMessage: 'Voice command failed. Please try again.',
        canRetry: true,
        timestamp: Date.now(),
      };
    }

    this.logError(errorDetails);
    return errorDetails;
  }

  /**
   * Handle widget error
   */
  handleWidgetError(error: any): ErrorDetails {
    const errorDetails: ErrorDetails = {
      code: 'WIDGET_ERROR',
      message: error.message || 'Widget operation failed',
      severity: 'warning',
      userMessage: 'Unable to load widget. Please try again.',
      canRetry: true,
      timestamp: Date.now(),
    };

    this.logError(errorDetails);
    return errorDetails;
  }

  /**
   * Show error alert to user
   */
  showErrorAlert(errorDetails: ErrorDetails, onRetry?: () => void): void {
    const buttons: any[] = [{ text: 'OK' }];

    if (errorDetails.canRetry && onRetry) {
      buttons.unshift({ text: 'Retry', onPress: onRetry });
    }

    Alert.alert('Error', errorDetails.userMessage, buttons);

    // Announce error to screen reader
    ttsService.speak(errorDetails.userMessage).catch(() => {});
  }
}

export const errorHandler = new ErrorHandler();

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[Retry] Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Wrap async operation with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorType: 'api' | 'voice' | 'widget' = 'api',
  showAlert: boolean = true
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    let errorDetails: ErrorDetails;

    switch (errorType) {
      case 'api':
        errorDetails = errorHandler.handleAPIError(error);
        break;
      case 'voice':
        errorDetails = errorHandler.handleVoiceError(error);
        break;
      case 'widget':
        errorDetails = errorHandler.handleWidgetError(error);
        break;
    }

    if (showAlert) {
      errorHandler.showErrorAlert(errorDetails);
    }

    return null;
  }
}

/**
 * Check network availability before operation
 */
export async function requireNetwork<T>(operation: () => Promise<T>): Promise<T> {
  if (!errorHandler.isNetworkAvailable()) {
    throw new Error('Network unavailable');
  }

  return await operation();
}

export default errorHandler;
