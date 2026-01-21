import { logger } from 'firebase-functions';

/**
 * CVPlus Core - Error Handling Utilities
 * 
 * Comprehensive error handling utilities for the CVPlus platform.
 * Provides error classification, logging, and user-friendly error messages.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// Import types from the types module to avoid conflicts
import type { 
  ErrorDetails as BaseErrorDetails, 
  ErrorSeverity,
  ErrorCategory 
} from '../types/error';

// ============================================================================
// EXTENDED TYPES
// ============================================================================

export interface CVErrorContext {
  operation?: string;
  component?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  environment?: 'development' | 'staging' | 'production';
  version?: string;
  action?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface CVErrorDetails extends Omit<BaseErrorDetails, 'timestamp'> {
  userMessage: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  retryable: boolean;
  context?: CVErrorContext;
  timestamp?: number;
}

export interface CVErrorHandler {
  handle(error: Error | unknown, context?: CVErrorContext): CVErrorDetails;
  log(errorDetails: CVErrorDetails): void;
  notify(errorDetails: CVErrorDetails): void;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class CVProcessingError extends Error {
  public readonly code: string;
  public readonly severity: CVErrorDetails['severity'];
  public readonly category: CVErrorDetails['category'];
  public readonly retryable: boolean;
  public readonly context?: CVErrorContext;

  constructor(
    message: string,
    code: string,
    severity: CVErrorDetails['severity'] = 'medium',
    category: CVErrorDetails['category'] = 'processing',
    retryable = false,
    context?: CVErrorContext
  ) {
    super(message);
    this.name = 'CVProcessingError';
    this.code = code;
    this.severity = severity;
    this.category = category;
    this.retryable = retryable;
    this.context = context;
  }
}

export class CVValidationError extends CVProcessingError {
  constructor(message: string, field?: string, context?: CVErrorContext) {
    super(message, 'VALIDATION_ERROR', 'medium', 'validation', false, {
      ...context,
      metadata: { ...context?.metadata, field },
    });
    this.name = 'CVValidationError';
  }
}

export class CVNetworkError extends CVProcessingError {
  constructor(message: string, statusCode?: number, context?: CVErrorContext) {
    super(message, 'NETWORK_ERROR', 'high', 'network', true, {
      ...context,
      metadata: { ...context?.metadata, statusCode },
    });
    this.name = 'CVNetworkError';
  }
}

export class CVAuthenticationError extends CVProcessingError {
  constructor(message: string, context?: CVErrorContext) {
    super(message, 'AUTH_ERROR', 'high', 'authentication', false, context);
    this.name = 'CVAuthenticationError';
  }
}

export class SystemError extends CVProcessingError {
  constructor(message: string, context?: CVErrorContext) {
    super(message, 'SYSTEM_ERROR', 'critical', 'system', false, context);
    this.name = 'SystemError';
  }
}

// ============================================================================
// ERROR HANDLER IMPLEMENTATION
// ============================================================================

export class DefaultErrorHandler implements CVErrorHandler {
  private errorCodes = new Map<string, Partial<CVErrorDetails>>([
    ['VALIDATION_ERROR', {
      userMessage: 'Please check your input and try again.',
      severity: 'medium',
      category: 'validation',
      retryable: false,
    }],
    ['NETWORK_ERROR', {
      userMessage: 'Connection error. Please check your internet connection and try again.',
      severity: 'high',
      category: 'network',
      retryable: true,
    }],
    ['AUTH_ERROR', {
      userMessage: 'Authentication failed. Please sign in again.',
      severity: 'high',
      category: 'authentication',
      retryable: false,
    }],
    ['PROCESSING_ERROR', {
      userMessage: 'Processing failed. Please try again later.',
      severity: 'medium',
      category: 'processing',
      retryable: true,
    }],
    ['SYSTEM_ERROR', {
      userMessage: 'A system error occurred. Our team has been notified.',
      severity: 'critical',
      category: 'system',
      retryable: false,
    }],
  ]);

  handle(error: Error | unknown, context?: CVErrorContext): CVErrorDetails {
    const timestamp = new Date();
    const fullContext = { ...context, timestamp };

    // Handle known error types
    if (error instanceof CVProcessingError) {
      return {
        code: error.code,
        message: error.message,
        userMessage: this.getUserMessage(error.code, error.message),
        severity: error.severity,
        category: error.category,
        retryable: error.retryable,
        context: { ...fullContext, ...error.context },
      };
    }

    // Handle standard errors
    if (error instanceof Error) {
      return this.handleStandardError(error, fullContext);
    }

    // Handle unknown errors
    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      userMessage: 'An unexpected error occurred. Please try again.',
      severity: 'medium',
      category: 'system',
      retryable: false,
      context: fullContext,
    };
  }

  log(errorDetails: CVErrorDetails): void {
    const logData = {
      timestamp: errorDetails.context?.timestamp || new Date(),
      code: errorDetails.code,
      message: errorDetails.message,
      severity: errorDetails.severity,
      category: errorDetails.category,
      context: errorDetails.context,
    };

    // In a real implementation, this would use a proper logging service
    if (errorDetails.severity === 'critical' || errorDetails.severity === 'high') {
      logger.error('[CVPlus Error]', logData);
    } else {
      logger.warn('[CVPlus Error]', logData);
    }
  }

  notify(errorDetails: CVErrorDetails): void {
    // In a real implementation, this would send notifications to error tracking services
    if (errorDetails.severity === 'critical') {
      logger.error('[CRITICAL ERROR - NOTIFICATION REQUIRED]', errorDetails);
    }
  }

  private handleStandardError(error: Error, context: CVErrorContext): CVErrorDetails {
    // Try to classify the error based on message or type
    let code = 'UNKNOWN_ERROR';
    let category: CVErrorDetails['category'] = 'system';
    let severity: CVErrorDetails['severity'] = 'medium';
    let retryable = false;

    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      code = 'NETWORK_ERROR';
      category = 'network';
      severity = 'high';
      retryable = true;
    } else if (message.includes('unauthorized') || message.includes('forbidden')) {
      code = 'AUTH_ERROR';
      category = 'authentication';
      severity = 'high';
      retryable = false;
    } else if (message.includes('validation') || message.includes('invalid')) {
      code = 'VALIDATION_ERROR';
      category = 'validation';
      severity = 'medium';
      retryable = false;
    }

    return {
      code,
      message: error.message,
      userMessage: this.getUserMessage(code, error.message),
      severity,
      category,
      retryable,
      context,
    };
  }

  private getUserMessage(code: string, originalMessage: string): string {
    const errorConfig = this.errorCodes.get(code);
    return errorConfig?.userMessage || originalMessage || 'An error occurred. Please try again.';
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const errorHandler = new DefaultErrorHandler();

export function handleError(error: Error | unknown, context?: CVErrorContext): CVErrorDetails {
  const errorDetails = errorHandler.handle(error, context);
  errorHandler.log(errorDetails);
  
  if (errorDetails.severity === 'critical') {
    errorHandler.notify(errorDetails);
  }
  
  return errorDetails;
}

export function createErrorContext(
  component: string,
  action: string,
  userId?: string,
  metadata?: Record<string, any>
): CVErrorContext {
  return {
    component,
    action,
    userId,
    metadata,
    timestamp: new Date(),
    environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
  };
}

export function isRetryableError(error: CVErrorDetails): boolean {
  return error.retryable;
}

export function shouldNotifyUser(error: CVErrorDetails): boolean {
  return error.severity === 'high' || error.severity === 'critical';
}

export function getUserFriendlyMessage(error: CVErrorDetails): string {
  return error.userMessage;
}

export function formatErrorForDisplay(error: CVErrorDetails): string {
  const timestamp = error.context?.timestamp?.toLocaleString() || 'Unknown time';
  return `[${timestamp}] ${error.userMessage} (Error code: ${error.code})`;
}

// ============================================================================
// REACT HOOK
// ============================================================================

export function useErrorHandler() {
  const handleErrorWithContext = (
    error: Error | unknown,
    component: string,
    action: string,
    userId?: string,
    metadata?: Record<string, any>
  ) => {
    const context = createErrorContext(component, action, userId, metadata);
    return handleError(error, context);
  };

  return {
    handleError: handleErrorWithContext,
    createContext: createErrorContext,
    isRetryable: isRetryableError,
    shouldNotify: shouldNotifyUser,
    formatForDisplay: formatErrorForDisplay,
  };
}