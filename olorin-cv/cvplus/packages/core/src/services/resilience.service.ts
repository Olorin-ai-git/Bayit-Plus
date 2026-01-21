/**
 * Resilience Service
 * 
 * Provides resilience patterns for external API calls including:
 * - Exponential backoff retry logic
 * - Circuit breaker pattern
 * - Rate limiting and throttling
 * - Request timeout handling
 * - Health check monitoring
 * 
 * @author Gil Klainert
 * @created 2025-08-20
 * @version 1.0
  */

import { logger } from 'firebase-functions';

/**
 * Retry configuration options
  */
export interface RetryConfig {
  /** Maximum number of retry attempts  */
  maxAttempts: number;
  
  /** Initial delay between retries in milliseconds  */
  initialDelayMs: number;
  
  /** Maximum delay between retries in milliseconds  */
  maxDelayMs: number;
  
  /** Exponential backoff multiplier  */
  backoffMultiplier: number;
  
  /** Jitter factor to randomize delays (0-1)  */
  jitterFactor: number;
  
  /** HTTP status codes that should trigger retries  */
  retryableStatusCodes: number[];
  
  /** Error types that should trigger retries  */
  retryableErrors: string[];
}

/**
 * Circuit breaker configuration
  */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit  */
  failureThreshold: number;
  
  /** Time to wait before attempting to close circuit (ms)  */
  resetTimeoutMs: number;
  
  /** Time window for counting failures (ms)  */
  failureWindowMs: number;
  
  /** Minimum number of requests before circuit can open  */
  minimumRequestCount: number;
}

/**
 * Rate limiting configuration
  */
export interface RateLimitConfig {
  /** Maximum requests per time window  */
  maxRequests: number;
  
  /** Time window in milliseconds  */
  windowMs: number;
  
  /** Delay between requests in milliseconds  */
  delayMs?: number;
}

/**
 * Circuit breaker states
  */
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Circuit breaker implementation
  */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this.updateRequestCount();

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        logger.info('[CIRCUIT-BREAKER] Attempting to close circuit (half-open state)');
      } else {
        logger.warn('[CIRCUIT-BREAKER] Circuit is open, executing fallback');
        if (fallback) {
          return await fallback();
        }
        throw new Error('Circuit breaker is open and no fallback provided');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private updateRequestCount(): void {
    const now = Date.now();
    if (now - this.windowStart > this.config.failureWindowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    this.requestCount++;
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      logger.info('[CIRCUIT-BREAKER] Circuit closed after successful operation');
    }
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.requestCount >= this.config.minimumRequestCount &&
        this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.warn('[CIRCUIT-BREAKER] Circuit opened due to failure threshold', {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold
      });
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime > this.config.resetTimeoutMs;
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Rate limiter implementation
  */
class RateLimiter {
  private requests: number[] = [];

  constructor(private config: RateLimitConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    
    const now = Date.now();
    this.requests.push(now);
    this.cleanOldRequests(now);

    if (this.config.delayMs) {
      await this.delay(this.config.delayMs);
    }

    return await operation();
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.cleanOldRequests(now);

    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.config.windowMs - (now - (oldestRequest || now));
      
      if (waitTime > 0) {
        logger.info('[RATE-LIMITER] Rate limit exceeded, waiting', { waitTimeMs: waitTime });
        await this.delay(waitTime);
      }
    }
  }

  private cleanOldRequests(now: number): void {
    const cutoff = now - this.config.windowMs;
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetrics() {
    return {
      currentRequests: this.requests.length,
      maxRequests: this.config.maxRequests,
      windowMs: this.config.windowMs
    };
  }
}

/**
 * Main resilience service
  */
export class ResilienceService {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private rateLimiters = new Map<string, RateLimiter>();

  constructor() {
    logger.info('[RESILIENCE-SERVICE] Resilience Service initialized');
  }

  /**
   * Execute operation with exponential backoff retry
    */
  async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
      ...config
    };

    let lastError: Error = new Error('No retry attempts were made');
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info('[RESILIENCE-SERVICE] Operation succeeded after retries', { 
            attempt, 
            totalAttempts: retryConfig.maxAttempts 
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryConfig.maxAttempts) {
          logger.error('[RESILIENCE-SERVICE] All retry attempts exhausted', {
            attempts: retryConfig.maxAttempts,
            finalError: lastError.message
          });
          break;
        }

        if (!this.shouldRetry(error, retryConfig)) {
          logger.warn('[RESILIENCE-SERVICE] Error not retryable, giving up', {
            error: lastError.message,
            attempt
          });
          break;
        }

        const delay = this.calculateDelay(attempt, retryConfig);
        logger.warn('[RESILIENCE-SERVICE] Operation failed, retrying', {
          attempt,
          nextAttempt: attempt + 1,
          delayMs: delay,
          error: lastError.message
        });

        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Execute operation with circuit breaker protection
    */
  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitName: string,
    config: Partial<CircuitBreakerConfig> = {},
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuitConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      failureWindowMs: 60000,
      minimumRequestCount: 3,
      ...config
    };

    if (!this.circuitBreakers.has(circuitName)) {
      this.circuitBreakers.set(circuitName, new CircuitBreaker(circuitConfig));
    }

    const circuitBreaker = this.circuitBreakers.get(circuitName)!;
    return await circuitBreaker.execute(operation, fallback);
  }

  /**
   * Execute operation with rate limiting
    */
  async withRateLimit<T>(
    operation: () => Promise<T>,
    limiterName: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<T> {
    const rateLimitConfig: RateLimitConfig = {
      maxRequests: 10,
      windowMs: 60000,
      ...config
    };

    if (!this.rateLimiters.has(limiterName)) {
      this.rateLimiters.set(limiterName, new RateLimiter(rateLimitConfig));
    }

    const rateLimiter = this.rateLimiters.get(limiterName)!;
    return await rateLimiter.execute(operation);
  }

  /**
   * Execute operation with full resilience (retry + circuit breaker + rate limiting)
    */
  async withFullResilience<T>(
    operation: () => Promise<T>,
    options: {
      operationName: string;
      retryConfig?: Partial<RetryConfig>;
      circuitConfig?: Partial<CircuitBreakerConfig>;
      rateLimitConfig?: Partial<RateLimitConfig>;
      fallback?: () => Promise<T>;
    }
  ): Promise<T> {
    const { operationName, retryConfig, circuitConfig, rateLimitConfig, fallback } = options;

    return await this.withRateLimit(
      () => this.withCircuitBreaker(
        () => this.withRetry(operation, retryConfig),
        operationName,
        circuitConfig,
        fallback
      ),
      operationName,
      rateLimitConfig
    );
  }

  /**
   * Execute operation with timeout
    */
  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Get metrics for all circuit breakers and rate limiters
    */
  getMetrics() {
    const circuitMetrics = Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
      name,
      type: 'circuit_breaker',
      ...breaker.getMetrics()
    }));

    const rateLimitMetrics = Array.from(this.rateLimiters.entries()).map(([name, limiter]) => ({
      name,
      type: 'rate_limiter',
      ...limiter.getMetrics()
    }));

    return {
      circuitBreakers: circuitMetrics,
      rateLimiters: rateLimitMetrics,
      totalComponents: circuitMetrics.length + rateLimitMetrics.length
    };
  }

  /**
   * Reset specific circuit breaker
    */
  resetCircuitBreaker(circuitName: string): boolean {
    const breaker = this.circuitBreakers.get(circuitName);
    if (breaker) {
      // Force reset by creating new instance
      this.circuitBreakers.delete(circuitName);
      logger.info('[RESILIENCE-SERVICE] Circuit breaker reset', { circuitName });
      return true;
    }
    return false;
  }

  /**
   * Create predefined configurations for common external services
    */
  static createHuggingFaceConfig() {
    return {
      retryConfig: {
        maxAttempts: 3,
        initialDelayMs: 2000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        jitterFactor: 0.2,
        retryableStatusCodes: [429, 500, 502, 503, 504],
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
      },
      circuitConfig: {
        failureThreshold: 3,
        resetTimeoutMs: 120000, // 2 minutes
        failureWindowMs: 60000,
        minimumRequestCount: 2
      },
      rateLimitConfig: {
        maxRequests: 5,
        windowMs: 60000, // 1 minute
        delayMs: 1000 // 1 second between requests
      }
    };
  }

  static createOpenAIConfig() {
    return {
      retryConfig: {
        maxAttempts: 4,
        initialDelayMs: 1000,
        maxDelayMs: 20000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
        retryableStatusCodes: [429, 500, 502, 503, 504],
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT']
      },
      circuitConfig: {
        failureThreshold: 5,
        resetTimeoutMs: 300000, // 5 minutes
        failureWindowMs: 120000,
        minimumRequestCount: 3
      },
      rateLimitConfig: {
        maxRequests: 20,
        windowMs: 60000,
        delayMs: 100
      }
    };
  }

  static createAnthropicConfig() {
    return {
      retryConfig: {
        maxAttempts: 3,
        initialDelayMs: 1500,
        maxDelayMs: 25000,
        backoffMultiplier: 2.5,
        jitterFactor: 0.15,
        retryableStatusCodes: [429, 500, 502, 503, 504],
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT']
      },
      circuitConfig: {
        failureThreshold: 4,
        resetTimeoutMs: 180000, // 3 minutes
        failureWindowMs: 90000,
        minimumRequestCount: 2
      },
      rateLimitConfig: {
        maxRequests: 15,
        windowMs: 60000,
        delayMs: 200
      }
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private shouldRetry(error: any, config: RetryConfig): boolean {
    // Check HTTP status codes
    if (error.response?.status) {
      return config.retryableStatusCodes.includes(error.response.status);
    }

    // Check error codes/types
    if (error.code) {
      return config.retryableErrors.includes(error.code);
    }

    // Check error messages for known patterns
    const errorMessage = error.message?.toLowerCase() || '';
    const retryablePatterns = [
      'timeout', 'network', 'connection', 'reset', 'temporary',
      'rate limit', 'quota', 'overload', 'unavailable'
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    
    // Add jitter to avoid thundering herd
    const jitter = cappedDelay * config.jitterFactor * Math.random();
    
    return Math.floor(cappedDelay + jitter);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const resilienceService = new ResilienceService();