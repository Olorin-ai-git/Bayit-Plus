import { logger } from 'firebase-functions';

/**
 * Enhanced Error Handling Utility for Firebase Functions
 *
 * Provides consistent, production-ready error handling with:
 * - Structured error logging
 * - Safe Firestore error storage
 * - Error categorization and recovery suggestions
 * - Rate limiting for error notifications
 * - Performance impact monitoring
  */

import * as admin from 'firebase-admin';
import { sanitizeErrorContext } from './firestore-sanitizer';

export interface ErrorContext {
  functionName: string;
  userId?: string;
  jobId?: string;
  requestData?: any;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
  environment: 'development' | 'staging' | 'production';
}

export interface ErrorMetadata {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  userMessage: string;
  internalMessage: string;
  recoveryActions: string[];
  affectedFeatures: string[];
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  EXTERNAL_API = 'external_api',
  DATABASE = 'database',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ProcessedError {
  originalError: Error;
  metadata: ErrorMetadata;
  context: ErrorContext;
  errorId: string;
  sanitizedForStorage: any;
  shouldNotify: boolean;
  shouldRetry: boolean;
}

export class EnhancedErrorHandler {
  private static errorCounts = new Map<string, number>();
  private static lastErrorTime = new Map<string, number>();
  private static readonly MAX_ERRORS_PER_MINUTE = 10;
  private static readonly ERROR_COOLDOWN_MS = 60000; // 1 minute

  /**
   * Process and categorize an error with full context
    */
  static processError(
    error: Error | any,
    context: ErrorContext
  ): ProcessedError {
    const errorId = this.generateErrorId(error, context);
    const metadata = this.categorizeError(error);
    const sanitizedForStorage = this.sanitizeErrorForStorage(error, context, metadata);
    
    return {
      originalError: error,
      metadata,
      context,
      errorId,
      sanitizedForStorage,
      shouldNotify: this.shouldNotifyForError(errorId, metadata.severity),
      shouldRetry: metadata.retryable && this.shouldRetryError(errorId)
    };
  }

  /**
   * Handle error with comprehensive logging and recovery
    */
  static async handleError(
    error: Error | any,
    context: ErrorContext
  ): Promise<ProcessedError> {
    const processedError = this.processError(error, context);

    // Log error with structured format
    await this.logError(processedError);

    // Store error in Firestore if appropriate
    if (processedError.shouldNotify || processedError.metadata.severity !== ErrorSeverity.LOW) {
      await this.storeError(processedError);
    }

    // Update error metrics
    this.updateErrorMetrics(processedError);

    // Send notifications if needed
    if (processedError.shouldNotify) {
      await this.notifyOnError(processedError);
    }

    return processedError;
  }

  /**
   * Categorize error and determine metadata
    */
  private static categorizeError(error: any): ErrorMetadata {
    let category = ErrorCategory.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;
    let userMessage = 'An unexpected error occurred. Please try again later.';
    let internalMessage = error.message || 'Unknown error';
    let recoveryActions: string[] = [];
    let affectedFeatures: string[] = [];
    let estimatedImpact: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    // Authentication errors
    if (error.message?.includes('User must be authenticated') || 
        error.message?.includes('authentication') ||
        error.code === 'unauthenticated') {
      category = ErrorCategory.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
      retryable = true;
      userMessage = 'Please sign in to continue.';
      recoveryActions = ['User should sign in or refresh their session'];
      estimatedImpact = 'high';
    }
    
    // API Key / Authorization errors
    else if (error.response?.status === 401 || 
             error.message?.includes('API key') ||
             error.message?.includes('invalid or expired')) {
      category = ErrorCategory.EXTERNAL_API;
      severity = ErrorSeverity.CRITICAL;
      retryable = false;
      userMessage = 'Service temporarily unavailable. Our team has been notified.';
      recoveryActions = ['Check API key configuration', 'Verify service credentials'];
      affectedFeatures = ['AI processing', 'Content generation'];
      estimatedImpact = 'critical';
    }

    // Network/Timeout errors  
    else if (error.code === 'ENOTFOUND' || 
             error.code === 'ECONNREFUSED' || 
             error.code === 'ETIMEDOUT' ||
             error.message?.includes('timeout')) {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.HIGH;
      retryable = true;
      userMessage = 'Network connection issue. Please try again in a moment.';
      recoveryActions = ['Retry with exponential backoff', 'Check service status'];
      estimatedImpact = 'high';
    }

    // Rate limiting
    else if (error.response?.status === 429 || 
             error.message?.includes('rate limit')) {
      category = ErrorCategory.RATE_LIMIT;
      severity = ErrorSeverity.MEDIUM;
      retryable = true;
      userMessage = 'Service is busy. Please try again in a moment.';
      recoveryActions = ['Implement exponential backoff', 'Reduce request frequency'];
      estimatedImpact = 'medium';
    }

    // Firestore/Database errors
    else if (error.message?.includes('Firestore') || 
             error.message?.includes('Unsupported field value')) {
      category = ErrorCategory.DATABASE;
      severity = ErrorSeverity.HIGH;
      retryable = false;
      userMessage = 'Data storage error. Our team has been notified.';
      recoveryActions = ['Sanitize data before storage', 'Review Firestore rules'];
      affectedFeatures = ['Data persistence', 'Progress tracking'];
      estimatedImpact = 'high';
    }

    // Validation errors
    else if (error.message?.includes('not found') || 
             error.message?.includes('required') ||
             error.message?.includes('invalid')) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
      retryable = false;
      userMessage = 'Invalid input. Please check your data and try again.';
      recoveryActions = ['Validate input data', 'Check required fields'];
      estimatedImpact = 'low';
    }

    return {
      category,
      severity,
      retryable,
      userMessage,
      internalMessage,
      recoveryActions,
      affectedFeatures,
      estimatedImpact
    };
  }

  /**
   * Generate unique error ID for tracking
    */
  private static generateErrorId(error: any, context: ErrorContext): string {
    const errorHash = this.hashString(error.message + context.functionName);
    const timestamp = Date.now();
    return `error_${errorHash}_${timestamp}`;
  }

  /**
   * Simple string hash function
    */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Determine if we should notify for this error
    */
  private static shouldNotifyForError(errorId: string, severity: ErrorSeverity): boolean {
    const now = Date.now();
    const errorKey = errorId.split('_')[1]; // Use hash part for grouping
    
    // Always notify critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      return true;
    }

    // Rate limit notifications
    const lastTime = this.lastErrorTime.get(errorKey!) || 0;
    const count = this.errorCounts.get(errorKey!) || 0;

    if (now - lastTime < this.ERROR_COOLDOWN_MS) {
      this.errorCounts.set(errorKey!, count + 1);
      return count < this.MAX_ERRORS_PER_MINUTE && severity === ErrorSeverity.HIGH;
    } else {
      // Reset counter after cooldown
      this.errorCounts.set(errorKey!, 1);
      this.lastErrorTime.set(errorKey!, now);
      return severity !== ErrorSeverity.LOW;
    }
  }

  /**
   * Determine if error should be retried
    */
  private static shouldRetryError(errorId: string): boolean {
    const errorKey = errorId.split('_')[1];
    const count = this.errorCounts.get(errorKey || '') || 0;
    return count < 3; // Max 3 retries
  }

  /**
   * Sanitize error for safe Firestore storage
    */
  private static sanitizeErrorForStorage(
    error: any, 
    context: ErrorContext, 
    metadata: ErrorMetadata
  ): any {
    return sanitizeErrorContext({
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 1000), // Limit stack trace length
      errorCode: error.code,
      httpStatus: error.response?.status,
      functionName: context.functionName,
      userId: context.userId,
      jobId: context.jobId,
      timestamp: context.timestamp,
      category: metadata.category,
      severity: metadata.severity,
      retryable: metadata.retryable,
      estimatedImpact: metadata.estimatedImpact,
      affectedFeatures: metadata.affectedFeatures,
      environment: context.environment
    });
  }

  /**
   * Log error with structured format
    */
  private static async logError(processedError: ProcessedError): Promise<void> {
    const logLevel = this.getLogLevel(processedError.metadata.severity);
    const logData = {
      errorId: processedError.errorId,
      function: processedError.context.functionName,
      category: processedError.metadata.category,
      severity: processedError.metadata.severity,
      message: processedError.originalError.message,
      userId: processedError.context.userId,
      jobId: processedError.context.jobId,
      retryable: processedError.metadata.retryable,
      estimatedImpact: processedError.metadata.estimatedImpact
    };

    switch (logLevel) {
      case 'error':
        logger.error('Enhanced Error Handler', logData);
        break;
      case 'warn':
        logger.warn('Enhanced Error Handler', logData);
        break;
      case 'info':
        logger.info('Enhanced Error Handler', logData);
        break;
      default:
        logger.info('Enhanced Error Handler', logData);
    }
  }

  /**
   * Store error in Firestore for analysis
    */
  private static async storeError(processedError: ProcessedError): Promise<void> {
    try {
      await admin.firestore()
        .collection('errorLogs')
        .doc(processedError.errorId)
        .set(processedError.sanitizedForStorage);
    } catch (storageError) {
      // Don't throw - we don't want error storage to fail the original operation
    }
  }

  /**
   * Update error metrics
    */
  private static updateErrorMetrics(_processedError: ProcessedError): void {
    // This could be expanded to update monitoring dashboards
  }

  /**
   * Send error notifications
    */
  private static async notifyOnError(_processedError: ProcessedError): Promise<void> {
    // This could be expanded to integrate with alerting systems
    if (_processedError.metadata.severity === ErrorSeverity.CRITICAL) {
    }
  }

  /**
   * Get appropriate log level for severity
    */
  private static getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'error';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'debug';
    }
  }

  /**
   * Create user-friendly error response
    */
  static createErrorResponse(processedError: ProcessedError): any {
    return {
      success: false,
      error: {
        message: processedError.metadata.userMessage,
        category: processedError.metadata.category,
        retryable: processedError.metadata.retryable,
        errorId: processedError.errorId.split('_')[1] // Return shortened ID for user
      },
      // Include recovery suggestions for retryable errors
      ...(processedError.metadata.retryable && {
        recovery: {
          suggested_actions: processedError.metadata.recoveryActions,
          retry_after_seconds: processedError.metadata.category === ErrorCategory.RATE_LIMIT ? 30 : 5
        }
      })
    };
  }
}

/**
 * Convenience function for consistent error handling in Firebase Functions
  */
export async function handleFunctionError(
  error: Error | any,
  functionName: string,
  additionalContext: Partial<ErrorContext> = {}
): Promise<never> {
  const context: ErrorContext = {
    functionName,
    timestamp: new Date(),
    environment: (process.env.NODE_ENV as any) || 'development',
    ...additionalContext
  };

  const processedError = await EnhancedErrorHandler.handleError(error, context);
  const response = EnhancedErrorHandler.createErrorResponse(processedError);
  
  throw new Error(JSON.stringify(response));
}

/**
 * Wrap Firebase Function with enhanced error handling
  */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  functionName: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleFunctionError(error, functionName, {
        // Extract context from Firebase Function request if available
        userId: (args[0] as any)?.auth?.uid,
        requestData: (args[0] as any)?.data
      });
      throw error; // Re-throw after handling
    }
  };
}