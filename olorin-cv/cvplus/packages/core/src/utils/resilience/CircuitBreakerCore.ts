import { logger } from 'firebase-functions';

/**
 * CircuitBreaker - Core circuit breaker pattern implementation
 * Extracted and focused version to comply with 200-line rule
  */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;
  private readonly monitorWindow: number;

  constructor(
    failureThreshold: number = 5,
    recoveryTimeout: number = 60000, // 1 minute
    monitorWindow: number = 300000    // 5 minutes
  ) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.monitorWindow = monitorWindow;
  }

  /**
   * Executes a function with circuit breaker protection
    */
  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        logger.info('🔄 Circuit breaker moving to HALF_OPEN state');
      } else {
        logger.info('⚠️ Circuit breaker is OPEN, executing fallback');
        if (fallback) {
          return await fallback();
        }
        throw new Error('Service temporarily unavailable - circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        logger.info('🔄 Executing fallback due to circuit breaker OPEN state');
        return await fallback();
      }
      throw error;
    }
  }

  /**
   * Records a successful execution
    */
  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info('✅ Circuit breaker reset to CLOSED state');
    }
  }

  /**
   * Records a failed execution
    */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.info(`❌ Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }

  /**
   * Determines if we should attempt to reset the circuit breaker
    */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.recoveryTimeout;
  }

  /**
   * Gets current circuit breaker status
    */
  getStatus(): {
    state: string;
    failureCount: number;
    lastFailureTime: number;
    isHealthy: boolean;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      isHealthy: this.state === 'CLOSED'
    };
  }

  /**
   * Manually resets the circuit breaker
    */
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
    logger.info('🔄 Circuit breaker manually reset');
  }

  /**
   * Checks if the circuit breaker is healthy
    */
  isHealthy(): boolean {
    return this.state === 'CLOSED';
  }

  /**
   * Gets failure rate over the monitor window
    */
  getFailureRate(): number {
    const now = Date.now();
    const windowStart = now - this.monitorWindow;
    
    if (this.lastFailureTime < windowStart) {
      return 0; // No recent failures
    }
    
    return this.failureCount / this.failureThreshold;
  }

  /**
   * Forces circuit breaker to open (for testing)
    */
  forceOpen(): void {
    this.state = 'OPEN';
    this.failureCount = this.failureThreshold;
    this.lastFailureTime = Date.now();
    logger.info('❌ Circuit breaker forced OPEN');
  }

  /**
   * Forces circuit breaker to close (for testing)
    */
  forceClose(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    logger.info('✅ Circuit breaker forced CLOSED');
  }
}

/**
 * Global circuit breaker instances for different services
  */
export class CircuitBreakerManager {
  private static breakers = new Map<string, CircuitBreaker>();

  /**
   * Gets or creates a circuit breaker for a specific service
    */
  static getBreaker(serviceName: string): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker());
    }
    return this.breakers.get(serviceName)!;
  }

  /**
   * Gets status of all circuit breakers
    */
  static getAllStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Resets all circuit breakers
    */
  static resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('🔄 All circuit breakers reset');
  }

  /**
   * Creates a circuit breaker with custom settings
    */
  static createBreaker(
    serviceName: string,
    failureThreshold: number,
    recoveryTimeout: number,
    monitorWindow: number
  ): CircuitBreaker {
    const breaker = new CircuitBreaker(failureThreshold, recoveryTimeout, monitorWindow);
    this.breakers.set(serviceName, breaker);
    return breaker;
  }

  /**
   * Removes a circuit breaker
    */
  static removeBreaker(serviceName: string): boolean {
    return this.breakers.delete(serviceName);
  }

  /**
   * Gets health status of all services
    */
  static getHealthStatus(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    for (const [name, breaker] of this.breakers) {
      health[name] = breaker.isHealthy();
    }
    return health;
  }
}