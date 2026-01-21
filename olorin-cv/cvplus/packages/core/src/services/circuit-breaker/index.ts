/**
 * Circuit Breaker Service Exports
 *
 * Provides circuit breaker pattern for fault tolerance
 */

export { CircuitBreakerService, circuitBreakerService } from './CircuitBreakerService';
export type { CircuitBreakerConfig, CircuitMetrics } from './CircuitBreakerService';
export { CircuitState } from './CircuitBreakerService';
