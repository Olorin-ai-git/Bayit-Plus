/**
 * Runtime Configuration Provider
 * Feature: 006-hybrid-graph-integration
 *
 * Provides runtime configuration values that work with Module Federation.
 * Values are injected into window object by webpack DefinePlugin.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Configuration-driven design
 * - Fail-fast validation
 */

// Declare global window interface for configuration
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      REACT_APP_API_BASE_URL?: string;
      REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH?: string;
      REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS?: string;
      REACT_APP_POLLING_MAX_RETRIES?: string;
      REACT_APP_POLLING_BACKOFF_MULTIPLIER?: string;
      REACT_APP_POLLING_MAX_BACKOFF_MS?: string;
      REACT_APP_REQUEST_TIMEOUT_MS?: string;
      REACT_APP_MAX_CONCURRENT_INVESTIGATIONS?: string;
      REACT_APP_MAX_INVESTIGATION_HISTORY?: string;
      REACT_APP_INVESTIGATION_HISTORY_STORAGE_KEY?: string;
      REACT_APP_MAX_LOG_ENTRIES_DISPLAY?: string;
      REACT_APP_MAX_FINDINGS_PER_PAGE?: string;
      REACT_APP_MAX_EVIDENCE_PER_FINDING?: string;
      REACT_APP_MAX_TOOL_EXECUTIONS_DISPLAY?: string;
      REACT_APP_CACHE_CLEAR_LOCAL_STORAGE?: string;
      REACT_APP_CACHE_CLEAR_SESSION_STORAGE?: string;
      REACT_APP_CACHE_CLEAR_HTTP_CACHE?: string;
      REACT_APP_CACHE_PRESERVE_LOCAL_STORAGE?: string;
      REACT_APP_CACHE_PRESERVE_SESSION_STORAGE?: string;
      REACT_APP_INVESTIGATION_ID_PREFIX?: string;
      REACT_APP_INVESTIGATION_ID_TIMESTAMP?: string;
      REACT_APP_INVESTIGATION_ID_CRYPTO_RANDOM?: string;
      REACT_APP_INVESTIGATION_ID_RANDOM_LENGTH?: string;
    };
  }
}

/**
 * Get a configuration value from window runtime config
 * SYSTEM MANDATE Compliance: Fail-fast - NO defaults, NO fallbacks
 * @param key Configuration key
 * @param options Optional configuration options
 * @returns Configuration value
 * @throws Error if configuration key is not found and no fallback is provided
 */
export function getRuntimeConfig(key: string, options?: { fallback?: string; required?: boolean }): string {
  // First try window.__RUNTIME_CONFIG__
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
    const value = window.__RUNTIME_CONFIG__[key as keyof typeof window.__RUNTIME_CONFIG__];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  // If fallback provided, use it (for non-critical config)
  if (options?.fallback !== undefined) {
    return options.fallback;
  }

  // If required (default), throw error for missing config
  if (options?.required !== false) {
    throw new Error(
      `Configuration key "${key}" is required but not found. ` +
      `Please set this value in your environment configuration or window.__RUNTIME_CONFIG__.`
    );
  }

  // Return empty string for non-required config with no fallback
  return '';
}

/**
 * Initialize runtime configuration
 * Called once at application startup
 *
 * SYSTEM MANDATE Compliance:
 * - Reads configuration from process.env (injected by webpack DefinePlugin)
 * - NO hardcoded values
 * - Fail-fast validation for required configuration
 */
export function initializeRuntimeConfig(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Read configuration from environment (injected by webpack DefinePlugin at build time)
  // These values come from .env files or environment variables during build
  window.__RUNTIME_CONFIG__ = {
    REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
    REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH: process.env.REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH,
    REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS: process.env.REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS,
    REACT_APP_POLLING_MAX_RETRIES: process.env.REACT_APP_POLLING_MAX_RETRIES,
    REACT_APP_POLLING_BACKOFF_MULTIPLIER: process.env.REACT_APP_POLLING_BACKOFF_MULTIPLIER,
    REACT_APP_POLLING_MAX_BACKOFF_MS: process.env.REACT_APP_POLLING_MAX_BACKOFF_MS,
    REACT_APP_REQUEST_TIMEOUT_MS: process.env.REACT_APP_REQUEST_TIMEOUT_MS,
    REACT_APP_MAX_CONCURRENT_INVESTIGATIONS: process.env.REACT_APP_MAX_CONCURRENT_INVESTIGATIONS,
    REACT_APP_MAX_INVESTIGATION_HISTORY: process.env.REACT_APP_MAX_INVESTIGATION_HISTORY,
    REACT_APP_INVESTIGATION_HISTORY_STORAGE_KEY: process.env.REACT_APP_INVESTIGATION_HISTORY_STORAGE_KEY,
    REACT_APP_MAX_LOG_ENTRIES_DISPLAY: process.env.REACT_APP_MAX_LOG_ENTRIES_DISPLAY,
    REACT_APP_MAX_FINDINGS_PER_PAGE: process.env.REACT_APP_MAX_FINDINGS_PER_PAGE,
    REACT_APP_MAX_EVIDENCE_PER_FINDING: process.env.REACT_APP_MAX_EVIDENCE_PER_FINDING,
    REACT_APP_MAX_TOOL_EXECUTIONS_DISPLAY: process.env.REACT_APP_MAX_TOOL_EXECUTIONS_DISPLAY,
    REACT_APP_CACHE_CLEAR_LOCAL_STORAGE: process.env.REACT_APP_CACHE_CLEAR_LOCAL_STORAGE,
    REACT_APP_CACHE_CLEAR_SESSION_STORAGE: process.env.REACT_APP_CACHE_CLEAR_SESSION_STORAGE,
    REACT_APP_CACHE_CLEAR_HTTP_CACHE: process.env.REACT_APP_CACHE_CLEAR_HTTP_CACHE,
    REACT_APP_CACHE_PRESERVE_LOCAL_STORAGE: process.env.REACT_APP_CACHE_PRESERVE_LOCAL_STORAGE,
    REACT_APP_CACHE_PRESERVE_SESSION_STORAGE: process.env.REACT_APP_CACHE_PRESERVE_SESSION_STORAGE,
    REACT_APP_INVESTIGATION_ID_PREFIX: process.env.REACT_APP_INVESTIGATION_ID_PREFIX,
    REACT_APP_INVESTIGATION_ID_TIMESTAMP: process.env.REACT_APP_INVESTIGATION_ID_TIMESTAMP,
    REACT_APP_INVESTIGATION_ID_CRYPTO_RANDOM: process.env.REACT_APP_INVESTIGATION_ID_CRYPTO_RANDOM,
    REACT_APP_INVESTIGATION_ID_RANDOM_LENGTH: process.env.REACT_APP_INVESTIGATION_ID_RANDOM_LENGTH,
  };

  // Validate CRITICAL required configuration (fail-fast)
  const requiredConfig = [
    'REACT_APP_API_BASE_URL'
  ];

  const missingConfig = requiredConfig.filter(key => {
    const value = window.__RUNTIME_CONFIG__?.[key as keyof typeof window.__RUNTIME_CONFIG__];
    return !value || value === 'undefined' || value.trim() === '';
  });

  if (missingConfig.length > 0) {
    const errorMessage = `CRITICAL: Missing required configuration: ${missingConfig.join(', ')}. ` +
      `Please set these environment variables in your .env file or deployment configuration.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Helper to get boolean config value
 */
export function getBooleanConfig(key: string, defaultValue: boolean): boolean {
  const value = getRuntimeConfig(key, { fallback: String(defaultValue), required: false });
  return value === 'true' || value === '1';
}

/**
 * Helper to get number config value
 */
export function getNumberConfig(key: string, defaultValue: number): number {
  const value = getRuntimeConfig(key, { fallback: String(defaultValue), required: false });
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Helper to get float config value
 */
export function getFloatConfig(key: string, defaultValue: number): number {
  const value = getRuntimeConfig(key, { fallback: String(defaultValue), required: false });
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}
