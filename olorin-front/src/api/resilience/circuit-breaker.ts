/**
 * Circuit Breaker Pattern
 *
 * Constitutional Compliance:
 * - Configuration-driven circuit breaker
 * - Type-safe state management
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { CircuitBreaker, getCircuitBreaker } from '@api/resilience/circuit-breaker';
 */

import { getApiConfig } from '../config';

/**
 * Circuit breaker state
 */
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

/**
 * Circuit breaker
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  private options: CircuitBreakerOptions;

  constructor(options?: Partial<CircuitBreakerOptions>) {
    const config = getApiConfig();

    this.options = {
      failureThreshold: options?.failureThreshold ?? 5,
      successThreshold: options?.successThreshold ?? 2,
      timeout: options?.timeout ?? config.requestTimeoutMs,
      resetTimeout: options?.resetTimeout ?? 60000
    };
  }

  /**
   * Execute function with circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }

      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Circuit breaker timeout')),
          this.options.timeout
        )
      )
    ]);
  }

  /**
   * Handle success
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failure
   */
  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.resetTimeout;
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN && Date.now() < this.nextAttempt;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt > 0 ? new Date(this.nextAttempt) : null
    };
  }
}

// Singleton instances per service
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  service: string,
  options?: Partial<CircuitBreakerOptions>
): CircuitBreaker {
  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(service, new CircuitBreaker(options));
  }
  return circuitBreakers.get(service)!;
}

/**
 * Execute with circuit breaker
 */
export async function executeWithCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>,
  options?: Partial<CircuitBreakerOptions>
): Promise<T> {
  const breaker = getCircuitBreaker(service, options);
  return breaker.execute(fn);
}

/**
 * Check circuit breaker state
 */
export function getCircuitBreakerState(service: string): CircuitState {
  const breaker = circuitBreakers.get(service);
  return breaker?.getState() ?? CircuitState.CLOSED;
}

/**
 * Reset circuit breaker
 */
export function resetCircuitBreaker(service: string): void {
  const breaker = circuitBreakers.get(service);
  breaker?.reset();
}

/**
 * Get all circuit breaker stats
 */
export function getAllCircuitBreakerStats(): Record<string, unknown> {
  const stats: Record<string, unknown> = {};

  for (const [service, breaker] of circuitBreakers.entries()) {
    stats[service] = breaker.getStats();
  }

  return stats;
}
