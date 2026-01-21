import { logger } from 'firebase-functions';

/**
 * @cvplus/recommendations - Retry Utility
 *
 * Advanced retry mechanisms with exponential backoff and circuit breaker.
 * Designed to reduce the 15% timeout failure rate to under 2%.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Retry strategy based on error type
 * - Performance monitoring
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import type {
  RetryConfiguration,
  RecommendationError,
  PerformanceMetrics
} from '../types/error';
import { RecommendationErrorType } from '../types/error';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfiguration = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  retryableErrors: [
    RecommendationErrorType.TIMEOUT,
    RecommendationErrorType.NETWORK_ERROR,
    RecommendationErrorType.AI_API_ERROR
  ],
  circuitBreaker: {
    threshold: 5, // 5 consecutive failures opens circuit
    timeout: 60000, // 60 seconds timeout
    resetTimeout: 300000 // 5 minutes to reset
  }
};

// ============================================================================
// INTERFACES
// ============================================================================

interface RetryAttempt {
  attempt: number;
  startTime: Date;
  endTime?: Date;
  error?: RecommendationError;
  success: boolean;
  delay: number;
}

interface RetryContext {
  requestId: string;
  operation: string;
  attempts: RetryAttempt[];
  totalTime: number;
  finalResult?: unknown;
  finalError?: RecommendationError;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime?: Date;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  resetTime?: Date;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    state: 'CLOSED'
  };
  private config: NonNullable<RetryConfiguration['circuitBreaker']>;

  constructor(config: NonNullable<RetryConfiguration['circuitBreaker']>) {
    this.config = config;
  }

  canExecute(): boolean {
    const now = Date.now();

    switch (this.state.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (this.state.resetTime && now >= this.state.resetTime.getTime()) {
          this.state.state = 'HALF_OPEN';
          logger.info('[CircuitBreaker] Moving to HALF_OPEN state');
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return false;
    }
  }

  onSuccess(): void {
    if (this.state.state === 'HALF_OPEN') {
      logger.info('[CircuitBreaker] Success in HALF_OPEN, closing circuit');
      this.reset();
    }
  }

  onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = new Date();

    if (this.state.failures >= this.config.threshold) {
      this.state.state = 'OPEN';
      this.state.resetTime = new Date(Date.now() + this.config.resetTimeout);
      logger.info(`[CircuitBreaker] Circuit opened after ${this.state.failures} failures`);
    }
  }

  reset(): void {
    this.state = {
      failures: 0,
      state: 'CLOSED'
    };
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

// ============================================================================
// RETRY UTILITY
// ============================================================================

export class RetryUtil {
  private config: RetryConfiguration;
  private circuitBreaker?: CircuitBreaker;
  private retryContexts = new Map<string, RetryContext>();

  constructor(config: Partial<RetryConfiguration> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    
    if (this.config.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(this.config.circuitBreaker);
    }
  }

  /**
   * Execute operation with retry logic and circuit breaker
    */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: {
      requestId: string;
      operationName: string;
      timeout?: number;
    }
  ): Promise<T> {
    const requestId = context.requestId;
    const operationName = context.operationName;
    const timeout = context.timeout || 300000; // 5 minute default timeout

    // Check circuit breaker
    if (this.circuitBreaker && !this.circuitBreaker.canExecute()) {
      const error = this.createError(
        RecommendationErrorType.NETWORK_ERROR,
        'Circuit breaker is OPEN',
        false,
        { requestId, operation: operationName }
      );
      throw error;
    }

    const retryContext: RetryContext = {
      requestId,
      operation: operationName,
      attempts: [],
      totalTime: 0
    };

    this.retryContexts.set(requestId, retryContext);

    const startTime = Date.now();
    let lastError: RecommendationError | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      const attemptStart = new Date();
      
      try {
        // Add timeout wrapper
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise<T>(timeout, requestId, operationName)
        ]);

        // Success - update circuit breaker and context
        this.circuitBreaker?.onSuccess();
        
        const attemptRecord: RetryAttempt = {
          attempt,
          startTime: attemptStart,
          endTime: new Date(),
          success: true,
          delay: 0
        };

        retryContext.attempts.push(attemptRecord);
        retryContext.totalTime = Date.now() - startTime;
        retryContext.finalResult = result;

        this.logRetrySuccess(requestId, attempt, retryContext);
        return result;

      } catch (error) {
        const retryError = this.normalizeError(error, requestId, operationName);
        lastError = retryError;

        const attemptRecord: RetryAttempt = {
          attempt,
          startTime: attemptStart,
          endTime: new Date(),
          error: retryError,
          success: false,
          delay: 0
        };

        retryContext.attempts.push(attemptRecord);

        // Check if error is retryable
        if (!this.isRetryable(retryError) || attempt === this.config.maxAttempts) {
          this.circuitBreaker?.onFailure();
          retryContext.totalTime = Date.now() - startTime;
          retryContext.finalError = retryError;
          
          this.logRetryFailure(requestId, attempt, retryContext);
          throw retryError;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        attemptRecord.delay = delay;

        this.logRetryAttempt(requestId, attempt, retryError, delay);
        await this.sleep(delay);
      }
    }

    // Should never reach here, but just in case
    this.circuitBreaker?.onFailure();
    throw lastError || this.createError(
      RecommendationErrorType.UNKNOWN,
      'Maximum retry attempts exceeded',
      false,
      { requestId, operation: operationName }
    );
  }

  /**
   * Check if error is retryable based on configuration
    */
  private isRetryable(error: RecommendationError): boolean {
    return this.config.retryableErrors.includes(error.type);
  }

  /**
   * Calculate delay with exponential backoff and jitter
    */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const delayWithJitter = exponentialDelay + jitter;
    
    return Math.min(delayWithJitter, this.config.maxDelay);
  }

  /**
   * Create a timeout promise that rejects after specified time
    */
  private createTimeoutPromise<T>(timeout: number, requestId: string, operation: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = this.createError(
          RecommendationErrorType.TIMEOUT,
          `Operation timed out after ${timeout}ms`,
          true,
          { requestId, operation, timeout }
        );
        reject(error);
      }, timeout);
    });
  }

  /**
   * Normalize different error types to RecommendationError
    */
  private normalizeError(error: unknown, requestId: string, operation: string): RecommendationError {
    if (error instanceof Error && 'type' in error) {
      return error as RecommendationError;
    }

    if (error instanceof Error) {
      let errorType = RecommendationErrorType.UNKNOWN;
      let retryable = false;

      // Classify error based on message patterns
      const message = error.message.toLowerCase();
      if (message.includes('timeout')) {
        errorType = RecommendationErrorType.TIMEOUT;
        retryable = true;
      } else if (message.includes('network') || message.includes('connection')) {
        errorType = RecommendationErrorType.NETWORK_ERROR;
        retryable = true;
      } else if (message.includes('api') || message.includes('service')) {
        errorType = RecommendationErrorType.AI_API_ERROR;
        retryable = true;
      } else if (message.includes('validation')) {
        errorType = RecommendationErrorType.VALIDATION_ERROR;
        retryable = false;
      } else if (message.includes('rate limit')) {
        errorType = RecommendationErrorType.RATE_LIMIT;
        retryable = true;
      }

      return this.createError(errorType, error.message, retryable, { requestId, operation });
    }

    return this.createError(
      RecommendationErrorType.UNKNOWN,
      String(error),
      false,
      { requestId, operation }
    );
  }

  /**
   * Create a standardized RecommendationError
    */
  private createError(
    type: RecommendationErrorType,
    message: string,
    retryable: boolean,
    context: Record<string, unknown>
  ): RecommendationError {
    const error = new Error(message) as RecommendationError;
    error.type = type;
    error.retryable = retryable;
    error.context = context;
    error.timestamp = new Date();
    return error;
  }

  /**
   * Sleep for specified milliseconds
    */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging methods for retry attempts
    */
  private logRetryAttempt(requestId: string, attempt: number, error: RecommendationError, delay: number): void {
    logger.warn(`[RetryUtil] ${requestId} - Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms`);
  }

  private logRetrySuccess(requestId: string, attempt: number, context: RetryContext): void {
    const message = attempt === 1 
      ? `[RetryUtil] ${requestId} - Success on first attempt (${context.totalTime}ms)`
      : `[RetryUtil] ${requestId} - Success after ${attempt} attempts (${context.totalTime}ms)`;
    logger.info(message);
  }

  private logRetryFailure(requestId: string, attempts: number, context: RetryContext): void {
    logger.error(`[RetryUtil] ${requestId} - Failed after ${attempts} attempts (${context.totalTime}ms):`, context.finalError);
  }

  // ============================================================================
  // MONITORING & STATS
  // ============================================================================

  /**
   * Get retry context for monitoring
    */
  getRetryContext(requestId: string): RetryContext | undefined {
    return this.retryContexts.get(requestId);
  }

  /**
   * Get circuit breaker state
    */
  getCircuitBreakerState(): CircuitBreakerState | null {
    return this.circuitBreaker?.getState() || null;
  }

  /**
   * Get performance metrics from retry operations
    */
  getPerformanceMetrics(): Partial<PerformanceMetrics> {
    const contexts = Array.from(this.retryContexts.values());
    
    if (contexts.length === 0) {
      return {
        errorRate: 0,
        timeoutRate: 0,
        timestamp: new Date()
      };
    }

    const failed = contexts.filter(c => c.finalError);
    const timeouts = contexts.filter(c => c.finalError?.type === RecommendationErrorType.TIMEOUT);
    
    return {
      errorRate: (failed.length / contexts.length) * 100,
      timeoutRate: (timeouts.length / contexts.length) * 100,
      timestamp: new Date()
    };
  }

  /**
   * Reset circuit breaker (for testing or manual intervention)
    */
  resetCircuitBreaker(): void {
    this.circuitBreaker?.reset();
  }

  /**
   * Clear retry contexts (prevent memory leaks)
    */
  clearOldContexts(maxAge: number = 3600000): void { // 1 hour default
    const cutoff = Date.now() - maxAge;
    
    for (const [requestId, context] of this.retryContexts.entries()) {
      if (context.attempts.length > 0) {
        const lastAttempt = context.attempts[context.attempts.length - 1];
        if (lastAttempt && lastAttempt.endTime && lastAttempt.endTime.getTime() < cutoff) {
          this.retryContexts.delete(requestId);
        }
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const retryUtil = new RetryUtil();