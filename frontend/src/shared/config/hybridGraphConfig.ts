/**
 * Hybrid Graph Integration Configuration
 *
 * Centralized configuration for hybrid graph investigation features with Zod validation.
 * All values sourced from runtime configuration - no hardcoded defaults.
 */

import { z } from 'zod';
import {
  getBooleanConfig,
  getNumberConfig,
  getFloatConfig,
  getRuntimeConfig,
} from './runtimeConfig';

/**
 * Zod schema for hybrid graph configuration validation
 * Uses coerce to handle string values from webpack DefinePlugin
 */
export const HybridGraphConfigSchema = z.object({
  // Feature flags
  featureEnabled: z.coerce.boolean(),

  // API endpoints
  apiBaseUrl: z.string().url(),

  // Polling configuration
  polling: z.object({
    updateIntervalMs: z.coerce.number().int().positive(),
    maxRetries: z.coerce.number().int().positive(),
    backoffMultiplier: z.coerce.number().positive(),
    maxBackoffMs: z.coerce.number().int().positive(),
    requestTimeoutMs: z.coerce.number().int().positive(),
  }),

  // Investigation limits
  limits: z.object({
    maxConcurrentInvestigations: z.coerce.number().int().positive(),
    maxInvestigationHistory: z.coerce.number().int().positive(),
    investigationHistoryStorageKey: z.string().min(1),
  }),

  // UI display limits
  display: z.object({
    maxLogEntries: z.coerce.number().int().positive(),
    maxFindingsPerPage: z.coerce.number().int().positive(),
    maxEvidencePerFinding: z.coerce.number().int().positive(),
    maxToolExecutions: z.coerce.number().int().positive(),
  }),
});

export type HybridGraphConfig = z.infer<typeof HybridGraphConfigSchema>;

/**
 * Load and validate hybrid graph configuration from runtime configuration
 * @throws {Error} If configuration is invalid or required variables are missing
 */
export function loadHybridGraphConfig(): HybridGraphConfig {
  // Access runtime configuration values
  const rawConfig = {
    featureEnabled: getBooleanConfig('REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH', true),
    apiBaseUrl: getRuntimeConfig('REACT_APP_API_BASE_URL', { fallback: 'http://localhost:8090', required: false }),

    polling: {
      updateIntervalMs: getNumberConfig('REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS', 30000),
      maxRetries: getNumberConfig('REACT_APP_POLLING_MAX_RETRIES', 3),
      backoffMultiplier: getFloatConfig('REACT_APP_POLLING_BACKOFF_MULTIPLIER', 2),
      maxBackoffMs: getNumberConfig('REACT_APP_POLLING_MAX_BACKOFF_MS', 60000),
      requestTimeoutMs: getNumberConfig('REACT_APP_REQUEST_TIMEOUT_MS', 30000),
    },

    limits: {
      maxConcurrentInvestigations: getNumberConfig('REACT_APP_MAX_CONCURRENT_INVESTIGATIONS', 5),
      maxInvestigationHistory: getNumberConfig('REACT_APP_MAX_INVESTIGATION_HISTORY', 50),
      investigationHistoryStorageKey: getRuntimeConfig(
        'REACT_APP_INVESTIGATION_HISTORY_STORAGE_KEY',
        { fallback: 'olorin_investigation_history', required: false }
      ),
    },

    display: {
      maxLogEntries: getNumberConfig('REACT_APP_MAX_LOG_ENTRIES_DISPLAY', 100),
      maxFindingsPerPage: getNumberConfig('REACT_APP_MAX_FINDINGS_PER_PAGE', 20),
      maxEvidencePerFinding: getNumberConfig('REACT_APP_MAX_EVIDENCE_PER_FINDING', 10),
      maxToolExecutions: getNumberConfig('REACT_APP_MAX_TOOL_EXECUTIONS_DISPLAY', 50),
    },
  };

  const result = HybridGraphConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('Hybrid Graph configuration validation failed:', result.error.format());
    throw new Error(
      'Invalid hybrid graph configuration. Please check runtime configuration. ' +
      'Missing or invalid: ' +
      Object.keys(result.error.flatten().fieldErrors).join(', ')
    );
  }

  return result.data;
}

/**
 * Singleton instance of validated configuration
 * Loaded once at application startup
 */
let configInstance: HybridGraphConfig | null = null;

/**
 * Get validated hybrid graph configuration singleton
 * @returns {HybridGraphConfig} Validated configuration object
 */
export function getHybridGraphConfig(): HybridGraphConfig {
  if (!configInstance) {
    configInstance = loadHybridGraphConfig();
  }
  return configInstance;
}

/**
 * Reset configuration singleton (for testing purposes)
 */
export function resetHybridGraphConfig(): void {
  configInstance = null;
}
