// @ts-ignore - Export conflicts/**
 * Circuit Breaker Utility
 * 
 * Implements circuit breaker pattern for fault tolerance
 * and preventing cascade failures in multimedia processing.
 */

import { CircuitBreakerConfig } from '../../types';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
}

/**
 * Circuit breaker implementation for multimedia services
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private requests: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number | null = null;

  constructor(private readonly config: CircuitBreakerConfig) {}

  /**
   * Check if operation can be executed
   */
  public canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (this.nextAttemptTime && now >= this.nextAttemptTime) {
          this.state = CircuitState.HALF_OPEN;
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Record successful operation
   */
  public recordSuccess(): void {
    this.requests++;
    this.successes++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Reset to closed state after successful operation in half-open
      this.reset();
    }
  }

  /**
   * Record failed operation
   */
  public recordFailure(): void {
    this.requests++;
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.nextAttemptTime = null;
  }

  /**
   * Get current statistics
   */
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      requests: this.requests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Get failure rate (0-1)
   */
  public getFailureRate(): number {
    if (this.requests === 0) return 0;
    return this.failures / this.requests;
  }

  /**
   * Check if circuit is open
   */
  public isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is closed
   */
  public isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is half-open
   */
  public isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.resetTimeout;
  }
}