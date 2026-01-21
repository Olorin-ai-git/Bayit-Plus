/**
 * Error Handler and Retry Logic
 * Centralized error handling with intelligent retry strategies
 */

// Error types and classifications
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Enhanced error interface
export interface AppError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
  timestamp: number;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  requestId?: string;
  correlationId?: string;
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
  retryCondition?: (error: AppError, attempt: number) => boolean;
  onRetry?: (error: AppError, attempt: number) => void;
}

// Default retry configurations for different error types
const DEFAULT_RETRY_CONFIGS: Record<ErrorType, Partial<RetryConfig>> = {
  [ErrorType.NETWORK]: {
    maxAttempts: 3,
    baseDelay: 1000,
    exponentialBase: 2,
    jitter: true,
  },
  [ErrorType.TIMEOUT]: {
    maxAttempts: 3,
    baseDelay: 2000,
    exponentialBase: 1.5,
  },
  [ErrorType.RATE_LIMIT]: {
    maxAttempts: 5,
    baseDelay: 5000,
    exponentialBase: 2,
  },
  [ErrorType.SERVER]: {
    maxAttempts: 2,
    baseDelay: 3000,
    exponentialBase: 2,
  },
  [ErrorType.AUTHENTICATION]: {
    maxAttempts: 1, // Don't retry auth errors
  },
  [ErrorType.AUTHORIZATION]: {
    maxAttempts: 1, // Don't retry authorization errors
  },
  [ErrorType.VALIDATION]: {
    maxAttempts: 1, // Don't retry validation errors
  },
  [ErrorType.NOT_FOUND]: {
    maxAttempts: 1, // Don't retry not found errors
  },
  [ErrorType.CONFLICT]: {
    maxAttempts: 1, // Don't retry conflict errors
  },
  [ErrorType.UNKNOWN]: {
    maxAttempts: 2,
    baseDelay: 1000,
    exponentialBase: 2,
  },
};

/**
 * Error classification and enhancement utility
 */
export class ErrorClassifier {
  static classify(error: Error | any): AppError {
    const timestamp = Date.now();
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;
    let userMessage = 'An unexpected error occurred';
    let technicalMessage = error.message || 'Unknown error';
    let status: number | undefined;
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    // Classify based on error properties
    if (error.name === 'TypeError' || error.name === 'NetworkError') {
      type = ErrorType.NETWORK;
      severity = ErrorSeverity.HIGH;
      retryable = true;
      userMessage = 'Network connection issue. Please check your internet connection and try again.';
    } else if (error.status) {
      status = error.status;
      code = error.code;
      details = error.details;

      switch (error.status) {
        case 400:
          type = ErrorType.VALIDATION;
          severity = ErrorSeverity.LOW;
          userMessage = 'Invalid request. Please check your input and try again.';
          break;

        case 401:
          type = ErrorType.AUTHENTICATION;
          severity = ErrorSeverity.HIGH;
          userMessage = 'Authentication required. Please log in and try again.';
          break;

        case 403:
          type = ErrorType.AUTHORIZATION;
          severity = ErrorSeverity.HIGH;
          userMessage = 'Access denied. You do not have permission to perform this action.';
          break;

        case 404:
          type = ErrorType.NOT_FOUND;
          severity = ErrorSeverity.MEDIUM;
          userMessage = 'The requested resource was not found.';
          break;

        case 409:
          type = ErrorType.CONFLICT;
          severity = ErrorSeverity.MEDIUM;
          userMessage = 'A conflict occurred. The resource may have been modified by another user.';
          break;

        case 429:
          type = ErrorType.RATE_LIMIT;
          severity = ErrorSeverity.MEDIUM;
          retryable = true;
          userMessage = 'Too many requests. Please wait a moment and try again.';
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          type = ErrorType.SERVER;
          severity = ErrorSeverity.HIGH;
          retryable = true;
          userMessage = 'Server error. Please try again in a few moments.';
          break;

        case 408:
          type = ErrorType.TIMEOUT;
          severity = ErrorSeverity.MEDIUM;
          retryable = true;
          userMessage = 'Request timed out. Please try again.';
          break;

        default:
          if (error.status >= 500) {
            type = ErrorType.SERVER;
            severity = ErrorSeverity.HIGH;
            retryable = true;
            userMessage = 'Server error. Please try again in a few moments.';
          }
      }
    } else if (error.name === 'AbortError') {
      type = ErrorType.TIMEOUT;
      severity = ErrorSeverity.LOW;
      retryable = true;
      userMessage = 'Request was cancelled. Please try again.';
    }

    return {
      ...error,
      type,
      severity,
      retryable,
      userMessage,
      technicalMessage,
      timestamp,
      status,
      code,
      details,
      requestId: error.requestId,
      correlationId: error.correlationId,
    } as AppError;
  }

  static isRetryable(error: AppError): boolean {
    return error.retryable && error.type !== ErrorType.AUTHENTICATION && error.type !== ErrorType.AUTHORIZATION;
  }

  static shouldRetryAfterDelay(error: AppError): boolean {
    return [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER, ErrorType.RATE_LIMIT].includes(error.type);
  }
}

/**
 * Retry mechanism with exponential backoff and jitter
 */
export class RetryHandler {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBase: 2,
      jitter: true,
      ...config,
    };

    let lastError: AppError | null = null;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        const classifiedError = ErrorClassifier.classify(error);
        lastError = classifiedError;

        // Check if we should retry
        const shouldRetry = attempt < finalConfig.maxAttempts &&
          (finalConfig.retryCondition?.(classifiedError, attempt) ?? ErrorClassifier.isRetryable(classifiedError));

        if (!shouldRetry) {
          throw classifiedError;
        }

        // Call retry callback if provided
        finalConfig.onRetry?.(classifiedError, attempt);

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, finalConfig);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private static calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt - 1);
    let delay = Math.min(exponentialDelay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static getRetryConfig(errorType: ErrorType): RetryConfig {
    const defaultConfig = DEFAULT_RETRY_CONFIGS[errorType] || {};
    return {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBase: 2,
      jitter: true,
      ...defaultConfig,
    };
  }
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();

      if (this.state === 'half-open') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * Error boundary for React components
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  errorInfo: any;
}

/**
 * User-friendly error messages
 */
export class UserErrorMessages {
  private static messages: Record<string, Record<string, string>> = {
    investigation: {
      fetch_failed: 'Unable to load investigation data. Please refresh the page or try again later.',
      create_failed: 'Failed to create investigation. Please check your input and try again.',
      update_failed: 'Unable to save changes. Please try again.',
      delete_failed: 'Failed to delete investigation. Please try again.',
      not_found: 'Investigation not found. It may have been deleted or you may not have access.',
    },
    evidence: {
      fetch_failed: 'Unable to load evidence data. Please refresh the page.',
      processing_failed: 'Evidence processing failed. Please try uploading again.',
      invalid_format: 'Invalid evidence format. Please check the file and try again.',
    },
    graph: {
      render_failed: 'Unable to display the investigation graph. Please try refreshing the page.',
      data_processing_failed: 'Failed to process graph data. Some connections may not be visible.',
      layout_failed: 'Graph layout failed. Please try a different visualization option.',
    },
    export: {
      failed: 'Export failed. Please try again or contact support if the problem persists.',
      timeout: 'Export is taking longer than expected. Please try again.',
      invalid_format: 'Invalid export format selected.',
    },
    websocket: {
      connection_failed: 'Real-time updates are currently unavailable. You can still use the application, but data may not update automatically.',
      disconnected: 'Connection lost. Attempting to reconnect...',
      reconnect_failed: 'Unable to establish real-time connection. Please refresh the page.',
    },
  };

  static getMessage(category: string, key: string, fallback?: string): string {
    return this.messages[category]?.[key] || fallback || 'An unexpected error occurred. Please try again.';
  }

  static addMessages(category: string, messages: Record<string, string>): void {
    if (!this.messages[category]) {
      this.messages[category] = {};
    }
    Object.assign(this.messages[category], messages);
  }
}

/**
 * Error logger for debugging and monitoring
 */
export class ErrorLogger {
  private static logs: AppError[] = [];
  private static maxLogs = 100;

  static log(error: AppError): void {
    this.logs.unshift({
      ...error,
      timestamp: Date.now(),
    });

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ${error.type} Error (${error.severity})`);
      console.error('User Message:', error.userMessage);
      console.error('Technical Message:', error.technicalMessage);
      console.error('Details:', error.details);
      console.error('Stack:', error.stack);
      console.groupEnd();
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production' && error.severity === ErrorSeverity.HIGH) {
      this.sendToMonitoring(error);
    }
  }

  static getLogs(): AppError[] {
    return [...this.logs];
  }

  static getLogsByType(type: ErrorType): AppError[] {
    return this.logs.filter(log => log.type === type);
  }

  static clearLogs(): void {
    this.logs = [];
  }

  private static async sendToMonitoring(error: AppError): Promise<void> {
    try {
      // Implementation would send to monitoring service like Sentry, LogRocket, etc.
      // await sendToSentry(error);
    } catch (monitoringError) {
      console.warn('Failed to send error to monitoring service:', monitoringError);
    }
  }
}

/**
 * Main error handler that combines all error handling strategies
 */
export class ErrorHandler {
  private static circuitBreakers = new Map<string, CircuitBreaker>();

  static async handleApiCall<T>(
    operation: () => Promise<T>,
    options: {
      operationName?: string;
      retryConfig?: Partial<RetryConfig>;
      useCircuitBreaker?: boolean;
      errorCategory?: string;
      errorKey?: string;
    } = {}
  ): Promise<T> {
    const {
      operationName = 'api_call',
      retryConfig,
      useCircuitBreaker = false,
      errorCategory = 'general',
      errorKey = 'operation_failed',
    } = options;

    let finalOperation = operation;

    // Wrap with circuit breaker if requested
    if (useCircuitBreaker) {
      const circuitBreaker = this.getCircuitBreaker(operationName);
      finalOperation = () => circuitBreaker.execute(operation);
    }

    try {
      return await RetryHandler.executeWithRetry(finalOperation, {
        ...retryConfig,
        onRetry: (error, attempt) => {
          ErrorLogger.log(error);
          retryConfig?.onRetry?.(error, attempt);
        },
      });
    } catch (error) {
      const classifiedError = ErrorClassifier.classify(error);

      // Enhance error with user-friendly message
      classifiedError.userMessage = UserErrorMessages.getMessage(
        errorCategory,
        errorKey,
        classifiedError.userMessage
      );

      ErrorLogger.log(classifiedError);
      throw classifiedError;
    }
  }

  private static getCircuitBreaker(name: string): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker());
    }
    return this.circuitBreakers.get(name)!;
  }

  static getCircuitBreakerState(name: string): any {
    return this.circuitBreakers.get(name)?.getState();
  }

  static resetCircuitBreaker(name: string): void {
    this.circuitBreakers.delete(name);
  }
}

// Export for component use
export { ErrorHandler as default };