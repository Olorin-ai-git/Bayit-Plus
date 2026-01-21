/**
 * Error Handling & Offline Mode Utilities
 *
 * Features:
 * - Network error detection
 * - Retry mechanisms with exponential backoff
 * - Offline mode detection
 * - Error logging with Sentry integration
 * - User-friendly error messages
 */

import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ttsService } from '@bayit/shared-services';
import i18n from '@bayit/shared-i18n';
import logger from './logger';

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
    logger.warn('Device went offline', 'ErrorHandler');

    Alert.alert(
      i18n.t('errors.offline.title'),
      i18n.t('errors.offline.message'),
      [{ text: i18n.t('errors.buttons.ok') }]
    );

    // Announce to screen reader
    ttsService.speak(i18n.t('errors.offline.ttsMessage')).catch(() => {});
  }

  /**
   * Handle online state
   */
  private handleOnline(): void {
    logger.info('Device is back online', 'ErrorHandler');

    Alert.alert(
      i18n.t('errors.online.title'),
      i18n.t('errors.online.message'),
      [{ text: i18n.t('errors.buttons.ok') }]
    );

    // Announce to screen reader
    ttsService.speak(i18n.t('errors.online.ttsMessage')).catch(() => {});
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

    // Log using unified logger (also sends to Sentry)
    if (error.severity === 'critical' || error.severity === 'error') {
      logger.error(`${error.code}: ${error.message}`, 'ErrorHandler', error);
    } else if (error.severity === 'warning') {
      logger.warn(`${error.code}: ${error.message}`, 'ErrorHandler', error);
    } else {
      logger.info(`${error.code}: ${error.message}`, 'ErrorHandler', error);
    }
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
            userMessage: i18n.t('errors.api.badRequest'),
            canRetry: false,
            timestamp: Date.now(),
          };
          break;

        case 401:
          errorDetails = {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            severity: 'error',
            userMessage: i18n.t('errors.api.unauthorized'),
            canRetry: false,
            timestamp: Date.now(),
          };
          break;

        case 403:
          errorDetails = {
            code: 'FORBIDDEN',
            message: 'Access denied',
            severity: 'error',
            userMessage: i18n.t('errors.api.forbidden'),
            canRetry: false,
            timestamp: Date.now(),
          };
          break;

        case 404:
          errorDetails = {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            severity: 'warning',
            userMessage: i18n.t('errors.api.notFound'),
            canRetry: false,
            timestamp: Date.now(),
          };
          break;

        case 429:
          errorDetails = {
            code: 'RATE_LIMIT',
            message: 'Too many requests',
            severity: 'warning',
            userMessage: i18n.t('errors.api.rateLimit'),
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
            userMessage: i18n.t('errors.api.serverError'),
            canRetry: true,
            timestamp: Date.now(),
          };
          break;

        default:
          errorDetails = {
            code: 'UNKNOWN_ERROR',
            message: data?.message || 'Unknown error occurred',
            severity: 'error',
            userMessage: i18n.t('errors.api.unknown'),
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
          ? i18n.t('errors.api.networkTimeout')
          : i18n.t('errors.api.offlineMessage'),
        canRetry: true,
        timestamp: Date.now(),
      };
    } else {
      // Error setting up request
      errorDetails = {
        code: 'REQUEST_ERROR',
        message: error.message || 'Request failed',
        severity: 'error',
        userMessage: i18n.t('errors.api.requestFailed'),
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
        userMessage: i18n.t('errors.voice.permissionDenied'),
        canRetry: false,
        timestamp: Date.now(),
      };
    } else if (error.code === 'RECOGNITION_FAILED') {
      errorDetails = {
        code: 'VOICE_RECOGNITION_FAILED',
        message: 'Speech recognition failed',
        severity: 'warning',
        userMessage: i18n.t('errors.voice.recognitionFailed'),
        canRetry: true,
        timestamp: Date.now(),
      };
    } else {
      errorDetails = {
        code: 'VOICE_ERROR',
        message: error.message || 'Voice command failed',
        severity: 'warning',
        userMessage: i18n.t('errors.voice.commandFailed'),
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
      userMessage: i18n.t('errors.widget.loadFailed'),
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
    const buttons: any[] = [{ text: i18n.t('errors.buttons.ok') }];

    if (errorDetails.canRetry && onRetry) {
      buttons.unshift({ text: i18n.t('errors.buttons.retry'), onPress: onRetry });
    }

    Alert.alert(i18n.t('errors.title'), errorDetails.userMessage, buttons);

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
        logger.debug(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, 'Retry');

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
    throw new Error(i18n.t('errors.networkUnavailable'));
  }

  return await operation();
}

export default errorHandler;
