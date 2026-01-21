// @ts-ignore - Export conflicts/**
 * Retry Manager Utility
 * 
 * Manages retry logic with exponential backoff, jitter,
 * and configurable retry policies for multimedia operations.
 */

import { RetryConfig } from '../../types';

export interface RetryResult<T> {
  result?: T;
  success: boolean;
  attempts: number;
  totalTime: number;
  lastError?: Error;
}

export interface RetryAttempt {
  attempt: number;
  delay: number;
  error?: Error;
  timestamp: number;
}

/**
 * Retry manager with advanced retry strategies
 */
export class RetryManager {
  constructor(private readonly config: RetryConfig) {}

  /**
   * Execute operation with retry logic
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const attempts: RetryAttempt[] = [];
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        
        return {
          result,
          success: true,
          attempts: attempt,
          totalTime: Date.now() - startTime,
        };

      } catch (error) {
        lastError = error as Error;
        
        const attemptInfo: RetryAttempt = {
          attempt,
          delay: 0,
          error: lastError,
          timestamp: Date.now()
        };

        attempts.push(attemptInfo);

        // Check if this error is retryable
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt <= this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          attemptInfo.delay = delay;
          
          await this.delay(delay);
        }
      }
    }

    return {
      success: false,
      attempts: attempts.length,
      totalTime: Date.now() - startTime,
      lastError
    };
  }

  /**
   * Execute with retry and progress callback
   */
  public async executeWithRetryAndProgress<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: Error, delay: number) => void
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        
        return {
          result,
          success: true,
          attempts: attempt,
          totalTime: Date.now() - startTime,
        };

      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryableError(lastError)) {
          break;
        }

        if (attempt <= this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          
          if (onRetry) {
            onRetry(attempt, lastError, delay);
          }
          
          await this.delay(delay);
        }
      }
    }

    return {
      success: false,
      attempts: this.config.maxRetries + 1,
      totalTime: Date.now() - startTime,
      lastError
    };
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(attempt: number): number {
    let delay: number;

    switch (this.config.strategy || 'exponential') {
      case 'linear':
        delay = this.config.baseDelay * attempt;
        break;
        
      case 'exponential':
        delay = this.config.baseDelay * Math.pow(2, attempt - 1);
        break;
        
      case 'fibonacci':
        delay = this.config.baseDelay * this.fibonacci(attempt);
        break;
        
      case 'fixed':
        delay = this.config.baseDelay;
        break;
        
      default:
        delay = this.config.baseDelay * Math.pow(2, attempt - 1);
    }

    // Apply jitter if enabled
    if (this.config.jitter) {
      const jitterAmount = delay * (this.config.jitter / 100);
      const jitterOffset = (Math.random() - 0.5) * 2 * jitterAmount;
      delay += jitterOffset;
    }

    // Ensure delay is within bounds
    delay = Math.max(delay, this.config.minDelay || 100);
    delay = Math.min(delay, this.config.maxDelay || 30000);

    return Math.floor(delay);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors are generally retryable
    if (name.includes('network') || 
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('enotfound') ||
        message.includes('econnreset')) {
      return true;
    }

    // Rate limiting errors are retryable
    if (message.includes('rate limit') ||
        message.includes('throttle') ||
        message.includes('quota')) {
      return true;
    }

    // Server errors (5xx) are retryable
    if (message.includes('server error') ||
        message.includes('internal server error') ||
        message.includes('service unavailable') ||
        message.includes('gateway timeout')) {
      return true;
    }

    // Resource temporarily unavailable
    if (message.includes('temporarily unavailable') ||
        message.includes('try again later')) {
      return true;
    }

    // Custom retryable error patterns
    if (this.config.retryableErrors) {
      for (const pattern of this.config.retryableErrors) {
        if (typeof pattern === 'string') {
          if (message.includes(pattern.toLowerCase())) {
            return true;
          }
        } else if (pattern instanceof RegExp) {
          if (pattern.test(message) || pattern.test(name)) {
            return true;
          }
        }
      }
    }

    // Default: don't retry
    return false;
  }

  /**
   * Calculate fibonacci number for fibonacci retry strategy
   */
  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    if (n === 2) return 1;
    
    let prev = 1;
    let curr = 1;
    
    for (let i = 3; i <= n; i++) {
      const next = prev + curr;
      prev = curr;
      curr = next;
    }
    
    return curr;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry-enabled version of an async function
   */
  public createRetryableFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string
  ): (...args: T) => Promise<RetryResult<R>> {
    return async (...args: T) => {
      return this.executeWithRetry(() => fn(...args), context);
    };
  }

  /**
   * Get retry configuration
   */
  public getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Calculate total maximum retry time
   */
  public calculateMaxRetryTime(): number {
    let totalTime = 0;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      totalTime += this.calculateDelay(attempt);
    }
    
    return totalTime;
  }
}