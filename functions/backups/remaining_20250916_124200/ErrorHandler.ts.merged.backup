// @ts-ignore - Export conflicts/**
 * Multimedia Error Handler
 * 
 * Centralized error handling for multimedia services with categorization,
 * retry logic, circuit breaking, and comprehensive logging.
 */

import { 
  MultimediaError,
  ErrorCategory,
  ErrorHandlingConfig,
  RetryConfig,
  CircuitBreakerConfig 
} from '../../types';

import { Logger } from '../utils/Logger';
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { RetryManager } from '../utils/RetryManager';

export class ErrorHandler {
  private readonly logger: Logger;
  private readonly circuitBreakers: Map<string, CircuitBreaker>;
  private readonly retryManager: RetryManager;
  private readonly config: ErrorHandlingConfig;

  constructor(config: ErrorHandlingConfig) {
    this.config = config;
    this.logger = new Logger('ErrorHandler');
    this.circuitBreakers = new Map();
    this.retryManager = new RetryManager(config.retry || {});
  }

  /**
   * Main error handling entry point
   */
  public handleError(error: Error, context: string = 'unknown'): MultimediaError {
    const multimediaError = this.categorizeError(error, context);
    
    // Log error with context
    this.logError(multimediaError, context);

    // Update circuit breaker state
    this.updateCircuitBreaker(context, false);

    // Determine if error is retryable
    if (this.isRetryableError(multimediaError)) {
      multimediaError.retryable = true;
    }

    // Apply error transformation rules
    return this.applyErrorTransforms(multimediaError);
  }

  /**
   * Handle successful operation (for circuit breaker)
   */
  public handleSuccess(context: string): void {
    this.updateCircuitBreaker(context, true);
  }

  /**
   * Categorize error into multimedia-specific categories
   */
  private categorizeError(error: Error, context: string): MultimediaError {
    if (error instanceof MultimediaError) {
      return error;
    }

    // Analyze error message and context to determine category
    const category = this.determineErrorCategory(error, context);
    
    return new MultimediaError(
      error.message,
      category,
      {
        originalError: error,
        context,
        timestamp: new Date().toISOString(),
        stack: error.stack
      }
    );
  }

  /**
   * Determine error category based on error patterns
   */
  private determineErrorCategory(error: Error, context: string): ErrorCategory {
    const message = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // File system errors
    if (message.includes('enoent') || message.includes('file not found')) {
      return 'FILE_NOT_FOUND';
    }

    if (message.includes('permission') || message.includes('access denied')) {
      return 'PERMISSION_DENIED';
    }

    // Processing errors
    if (context.includes('process') || message.includes('codec') || message.includes('format')) {
      return 'PROCESSING_ERROR';
    }

    // Network errors
    if (errorName.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    }

    // Storage errors
    if (context.includes('storage') || message.includes('upload') || message.includes('download')) {
      return 'STORAGE_ERROR';
    }

    // Validation errors
    if (context.includes('validation') || message.includes('invalid') || message.includes('malformed')) {
      return 'VALIDATION_ERROR';
    }

    // Memory/Resource errors
    if (message.includes('memory') || message.includes('heap') || message.includes('resource')) {
      return 'RESOURCE_ERROR';
    }

    // Security errors
    if (message.includes('security') || message.includes('malware') || message.includes('virus')) {
      return 'SECURITY_ERROR';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('quota') || message.includes('throttle')) {
      return 'RATE_LIMIT_ERROR';
    }

    // Configuration errors
    if (message.includes('config') || message.includes('missing') && message.includes('key')) {
      return 'CONFIGURATION_ERROR';
    }

    // Default to generic error
    return 'PROCESSING_ERROR';
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: MultimediaError): boolean {
    const retryableCategories: ErrorCategory[] = [
      'NETWORK_ERROR',
      'RATE_LIMIT_ERROR',
      'TIMEOUT_ERROR',
      'RESOURCE_ERROR'
    ];

    return retryableCategories.includes(error.category);
  }

  /**
   * Apply error transformation rules based on configuration
   */
  private applyErrorTransforms(error: MultimediaError): MultimediaError {
    // Apply user-friendly message transforms
    if (this.config.friendlyMessages) {
      error.message = this.getFriendlyMessage(error);
    }

    // Add suggestions for common errors
    if (this.config.includeSuggestions) {
      error.suggestions = this.getErrorSuggestions(error);
    }

    // Sanitize sensitive information
    if (this.config.sanitizeErrors) {
      error = this.sanitizeError(error);
    }

    return error;
  }

  /**
   * Get user-friendly error messages
   */
  private getFriendlyMessage(error: MultimediaError): string {
    switch (error.category) {
      case 'FILE_NOT_FOUND':
        return 'The requested file could not be found. Please check the file path and try again.';
      
      case 'PERMISSION_DENIED':
        return 'Access denied. Please check file permissions or authentication credentials.';
      
      case 'PROCESSING_ERROR':
        return 'An error occurred while processing the media file. The file format may not be supported.';
      
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection and try again.';
      
      case 'STORAGE_ERROR':
        return 'Failed to save or retrieve the file. Storage service may be temporarily unavailable.';
      
      case 'VALIDATION_ERROR':
        return 'The provided file or data is invalid. Please check the format and try again.';
      
      case 'RESOURCE_ERROR':
        return 'Insufficient resources to complete the operation. Please try again later.';
      
      case 'SECURITY_ERROR':
        return 'Security validation failed. The file may contain unsafe content.';
      
      case 'RATE_LIMIT_ERROR':
        return 'Too many requests. Please wait before trying again.';
      
      case 'CONFIGURATION_ERROR':
        return 'Service configuration error. Please contact support.';
      
      default:
        return error.message;
    }
  }

  /**
   * Get suggestions for error resolution
   */
  private getErrorSuggestions(error: MultimediaError): string[] {
    switch (error.category) {
      case 'FILE_NOT_FOUND':
        return [
          'Verify the file path is correct',
          'Ensure the file has not been moved or deleted',
          'Check if you have read permissions for the file'
        ];
      
      case 'PROCESSING_ERROR':
        return [
          'Try converting the file to a supported format',
          'Check if the file is corrupted',
          'Reduce file size if it\'s very large'
        ];
      
      case 'NETWORK_ERROR':
        return [
          'Check your internet connection',
          'Try again in a few moments',
          'Contact support if the issue persists'
        ];
      
      case 'RATE_LIMIT_ERROR':
        return [
          'Wait before making additional requests',
          'Consider upgrading to a higher tier plan',
          'Implement request batching'
        ];
      
      default:
        return ['Contact support if the issue persists'];
    }
  }

  /**
   * Sanitize error information to prevent sensitive data leaks
   */
  private sanitizeError(error: MultimediaError): MultimediaError {
    // Remove sensitive paths
    error.message = error.message.replace(/\/[^\/\s]+\/[^\/\s]+\/[^\/\s]+/g, '[REDACTED_PATH]');
    
    // Remove potential API keys or tokens
    error.message = error.message.replace(/[a-zA-Z0-9]{20,}/g, '[REDACTED_TOKEN]');
    
    // Sanitize stack trace if present
    if (error.details?.stack) {
      error.details.stack = this.sanitizeStackTrace(error.details.stack as string);
    }

    return error;
  }

  /**
   * Sanitize stack trace information
   */
  private sanitizeStackTrace(stack: string): string {
    return stack
      .split('\n')
      .map(line => {
        // Remove full paths, keep only filename
        return line.replace(/\/[^\/\s]+\/[^\/\s]+\/[^\/\s]+/g, '[REDACTED_PATH]');
      })
      .join('\n');
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(error: MultimediaError, context: string): void {
    const logData = {
      category: error.category,
      context,
      retryable: error.retryable,
      timestamp: new Date().toISOString(),
      details: error.details
    };

    // Determine log level based on error severity
    switch (error.category) {
      case 'SECURITY_ERROR':
      case 'CONFIGURATION_ERROR':
        this.logger.error(error.message, logData);
        break;
      
      case 'PROCESSING_ERROR':
      case 'STORAGE_ERROR':
        this.logger.warn(error.message, logData);
        break;
      
      case 'VALIDATION_ERROR':
      case 'RATE_LIMIT_ERROR':
        this.logger.info(error.message, logData);
        break;
      
      default:
        this.logger.debug(error.message, logData);
    }
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(context: string, success: boolean): void {
    if (!this.config.circuitBreaker?.enabled) {
      return;
    }

    if (!this.circuitBreakers.has(context)) {
      this.circuitBreakers.set(
        context,
        new CircuitBreaker(this.config.circuitBreaker)
      );
    }

    const breaker = this.circuitBreakers.get(context)!;
    
    if (success) {
      breaker.recordSuccess();
    } else {
      breaker.recordFailure();
    }
  }

  /**
   * Check if circuit breaker allows operation
   */
  public isOperationAllowed(context: string): boolean {
    if (!this.config.circuitBreaker?.enabled) {
      return true;
    }

    const breaker = this.circuitBreakers.get(context);
    return breaker ? breaker.canExecute() : true;
  }

  /**
   * Get circuit breaker statistics
   */
  public getCircuitBreakerStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.circuitBreakers.forEach((breaker, context) => {
      stats[context] = breaker.getStats();
    });

    return stats;
  }

  /**
   * Reset circuit breaker for specific context
   */
  public resetCircuitBreaker(context: string): void {
    const breaker = this.circuitBreakers.get(context);
    if (breaker) {
      breaker.reset();
    }
  }
}