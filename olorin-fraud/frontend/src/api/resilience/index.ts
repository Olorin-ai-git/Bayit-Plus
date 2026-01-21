/**
 * Resilience Module
 *
 * Centralized exports for resilience patterns.
 *
 * Constitutional Compliance:
 * - Configuration-driven resilience
 * - Type-safe error handling
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { CircuitBreaker, HealthChecker, OfflineManager } from '@api/resilience';
 */

export * from './health';
export * from './circuit-breaker';
export * from './offline';
