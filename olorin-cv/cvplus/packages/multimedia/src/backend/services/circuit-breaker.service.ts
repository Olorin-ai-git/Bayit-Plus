import { logger } from 'firebase-functions';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreakerService {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: Date;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    monitoringPeriodMs: 300000
  }) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        logger.info('Circuit breaker attempting reset');
      } else {
        logger.warn('Circuit breaker is open, using fallback');
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
      
      if (fallback && this.state === CircuitState.HALF_OPEN) {
        logger.warn('Operation failed, using fallback', { error });
        return await fallback();
      }
      
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.warn('Circuit breaker opened due to failures', { 
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold 
      });
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.resetTimeoutMs;
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  // Additional methods required by enhanced-video-generation service
  registerProvider(providerId: string): void {
    logger.info(`Registered provider with circuit breaker: ${providerId}`);
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  recordSuccess(providerId?: string): void {
    if (providerId) {
      logger.info(`Recording success for provider: ${providerId}`);
    }
    this.onSuccess();
  }

  recordFailure(providerId?: string): void {
    if (providerId) {
      logger.warn(`Recording failure for provider: ${providerId}`);
    }
    this.onFailure();
  }

  getStatistics(): {
    state: CircuitState;
    failureCount: number;
    lastFailureTime?: Date;
    uptime?: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      uptime: this.lastFailureTime ? Date.now() - this.lastFailureTime.getTime() : undefined
    };
  }

  cleanup(): void {
    logger.info('Circuit breaker cleanup completed');
    // Reset state if needed
    this.failureCount = 0;
    this.lastFailureTime = undefined;
  }
}