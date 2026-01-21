import { logger } from 'firebase-functions';

/**
 * Shared Services Index - Enhanced Service Layer Architecture
 *
 * Centralized exports for all shared service components, including
 * enhanced base services, mixins, and utilities.
 *
 * @author Gil Klainert
 * @version 2.1.0
 * @updated 2025-09-14
 *
 * MIGRATION PHASE 4B: Analytics & Premium Services Migration
 * Staging areas prepared for domain services migration
  */

// Import for internal use
import { ServiceRegistry } from "./service-registry";
import type { ServiceHealth } from "./base-service";

// Core service architecture - Values
export { BaseService } from "./base-service";
export { EnhancedBaseService } from "./enhanced-base-service";
// Logger moved to @cvplus/logging submodule - import from there
export { ServiceRegistry } from "./service-registry";

// Core service architecture - Types
export type { ServiceConfig, ServiceHealth } from "./base-service";
export type { EnhancedServiceConfig } from "./enhanced-base-service";
// LogContext moved to @cvplus/logging submodule - import from there

// Mixins for common functionality
export { CacheableMixin, createCacheableMixin } from './cache-mixin';
export type { CacheOptions, CacheResult, CacheMetricsData } from './cache-mixin';
export { DatabaseMixin, createDatabaseMixin } from './database-mixin';
export type { DatabaseOptions, QueryResult, QueryFilter, DatabaseOperation, DatabaseError } from './database-mixin';
export { ApiClientMixin, createApiClientMixin } from './api-client-mixin';
export type { ApiClientOptions, ApiRequestOptions, ApiResponse, ApiError, RateLimitState } from './api-client-mixin';

// Cache services (re-exports from cache index)
export * from './cache';

// Feature flags service
export { featureFlagsService } from './feature-flags';
export type { FeatureFlagValue, FeatureFlagMetrics } from './feature-flags';

// Error handling and reliability services
export * from './retry';
export * from './circuit-breaker';
export * from './dlq';

// Communication services
export * from './email';

// Security services migrated to @cvplus/admin
// Use backward compatibility exports from main index

// MIGRATION PHASE 4B: Domain Services Staging
// The following services have been COPIED to staging areas for migration preparation:
//
// - analytics-cache.service.ts
// - cache-performance-monitor.service.ts
//
// - subscription-cache.service.ts (moved to @cvplus/premium)
// - pricing-cache.service.ts (moved to @cvplus/premium)
// - tier-management/ (moved to @cvplus/premium)
// - feature-access-cache.service.ts
// - usage-batch-cache.service.ts
//
// - Complete external-data/ directory with adapters and enrichment services
//
// NOTE: Original exports maintained for backward compatibility.
// Staging areas prepared for future submodule migration.

// Service factory functions
export function createServiceRegistry(): ServiceRegistry {
  return ServiceRegistry.getInstance({
    autoInitialize: true,
    healthCheckInterval: 60000
  });
}

/**
 * Initialize enhanced services with common patterns
  */
export async function initializeEnhancedServices(): Promise<void> {
  const registry = createServiceRegistry();

  // Services will be registered by their respective modules
  // This function provides a common initialization pattern

  await registry.initializeAll();
  logger.info('Enhanced services initialized successfully');
}

/**
 * Perform health check on all registered services
  */
export async function performServicesHealthCheck(): Promise<Record<string, ServiceHealth>> {
  const registry = ServiceRegistry.getInstance();
  return await registry.getHealthStatus();
}

/**
 * Cleanup all services (for graceful shutdown)
  */
export async function cleanupAllServices(): Promise<void> {
  const registry = ServiceRegistry.getInstance();
  await registry.cleanupAll();
  logger.info('All services cleaned up successfully');
}