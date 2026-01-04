/**
 * Event Persistence Configuration
 * Configuration-driven persistence settings from environment variables
 * Feature: Event persistence system
 *
 * SYSTEM MANDATE: All configuration values from process.env (NO hardcoded values)
 */

import type { PersistenceConfig } from '../types/persistence-types';

/**
 * Load persistence configuration from environment variables
 * All values come from process.env - NO hardcoded defaults
 */
function loadPersistenceConfig(): PersistenceConfig {
  return {
    storageKey: process.env.REACT_APP_PERSISTENCE_STORAGE_KEY || '',
    maxEvents: parseInt(
      process.env.REACT_APP_PERSISTENCE_MAX_EVENTS || '0',
      10
    ),
    retryInterval: parseInt(
      process.env.REACT_APP_PERSISTENCE_RETRY_INTERVAL_MS || '0',
      10
    ),
    maxRetries: parseInt(
      process.env.REACT_APP_PERSISTENCE_MAX_RETRIES || '0',
      10
    ),
    compressionEnabled:
      process.env.REACT_APP_PERSISTENCE_COMPRESSION_ENABLED === 'true',
    encryptionEnabled:
      process.env.REACT_APP_PERSISTENCE_ENCRYPTION_ENABLED === 'true',
    autoSync: process.env.REACT_APP_PERSISTENCE_AUTO_SYNC === 'true',
    batchSize: parseInt(
      process.env.REACT_APP_PERSISTENCE_BATCH_SIZE || '0',
      10
    ),
  };
}

/**
 * Validate persistence configuration
 * Logs warnings for missing or invalid values
 */
function validatePersistenceConfig(config: PersistenceConfig): void {
  if (!config.storageKey) {
    console.warn(
      '[PersistenceConfig] Missing REACT_APP_PERSISTENCE_STORAGE_KEY - events will not be persisted'
    );
  }

  if (config.maxEvents <= 0) {
    console.warn(
      '[PersistenceConfig] Invalid REACT_APP_PERSISTENCE_MAX_EVENTS - must be > 0'
    );
  }

  if (config.retryInterval <= 0) {
    console.warn(
      '[PersistenceConfig] Invalid REACT_APP_PERSISTENCE_RETRY_INTERVAL_MS - must be > 0'
    );
  }

  if (config.maxRetries <= 0) {
    console.warn(
      '[PersistenceConfig] Invalid REACT_APP_PERSISTENCE_MAX_RETRIES - must be > 0'
    );
  }

  if (config.batchSize <= 0) {
    console.warn(
      '[PersistenceConfig] Invalid REACT_APP_PERSISTENCE_BATCH_SIZE - must be > 0'
    );
  }
}

/**
 * Default persistence configuration (loaded from environment)
 * Validates configuration on load
 */
export const defaultPersistenceConfig: PersistenceConfig = (() => {
  const config = loadPersistenceConfig();
  validatePersistenceConfig(config);
  return config;
})();

/**
 * Get persistence configuration (with optional overrides)
 */
export function getPersistenceConfig(
  overrides?: Partial<PersistenceConfig>
): PersistenceConfig {
  return {
    ...defaultPersistenceConfig,
    ...overrides,
  };
}

/**
 * Storage size limit from environment (in bytes)
 */
export function getStorageSizeLimit(): number {
  const limitMB = parseInt(
    process.env.REACT_APP_PERSISTENCE_STORAGE_LIMIT_MB || '0',
    10
  );

  if (limitMB <= 0) {
    console.warn(
      '[PersistenceConfig] Invalid REACT_APP_PERSISTENCE_STORAGE_LIMIT_MB - using 0 (no limit)'
    );
    return 0;
  }

  return limitMB * 1024 * 1024; // Convert MB to bytes
}

/**
 * Critical events to auto-persist (loaded from environment)
 */
export function getCriticalEvents(): string[] {
  const eventsStr = process.env.REACT_APP_PERSISTENCE_CRITICAL_EVENTS || '';

  if (!eventsStr) {
    console.warn(
      '[PersistenceConfig] Missing REACT_APP_PERSISTENCE_CRITICAL_EVENTS - no events will be auto-persisted'
    );
    return [];
  }

  return eventsStr.split(',').map((e) => e.trim());
}

/**
 * Check if persistence is enabled
 */
export function isPersistenceEnabled(): boolean {
  return process.env.REACT_APP_FEATURE_ENABLE_PERSISTENCE === 'true';
}

/**
 * Environment variable documentation
 *
 * Required environment variables:
 * - REACT_APP_PERSISTENCE_STORAGE_KEY: localStorage key for persisted events
 * - REACT_APP_PERSISTENCE_MAX_EVENTS: Maximum number of events to persist
 * - REACT_APP_PERSISTENCE_RETRY_INTERVAL_MS: Retry interval in milliseconds
 * - REACT_APP_PERSISTENCE_MAX_RETRIES: Maximum retry attempts
 * - REACT_APP_PERSISTENCE_BATCH_SIZE: Batch size for synchronization
 * - REACT_APP_PERSISTENCE_STORAGE_LIMIT_MB: Storage limit in megabytes
 * - REACT_APP_PERSISTENCE_CRITICAL_EVENTS: Comma-separated list of critical events
 *
 * Optional environment variables:
 * - REACT_APP_PERSISTENCE_COMPRESSION_ENABLED: Enable compression (default: false)
 * - REACT_APP_PERSISTENCE_ENCRYPTION_ENABLED: Enable encryption (default: false)
 * - REACT_APP_PERSISTENCE_AUTO_SYNC: Enable automatic synchronization (default: false)
 * - REACT_APP_FEATURE_ENABLE_PERSISTENCE: Enable persistence feature (default: false)
 */
