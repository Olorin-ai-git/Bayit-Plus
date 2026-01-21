/**
 * Financial Configuration
 * Feature: 025-financial-analysis-frontend
 *
 * Configuration schema and loader for financial analysis features.
 * Uses safe browser-compatible configuration loading.
 */

import { z } from 'zod';

/**
 * Zod schema for financial configuration validation.
 */
export const FinancialConfigSchema = z.object({
  enabled: z.coerce.boolean(),
  refreshIntervalMs: z.coerce.number().int().positive(),
  currencyCode: z.string().length(3),
  currencyLocale: z.string().min(2),
});

export type FinancialConfig = z.infer<typeof FinancialConfigSchema>;

let cachedConfig: FinancialConfig | null = null;

/**
 * Get configuration value safely from window.__RUNTIME_CONFIG__ or return fallback.
 * This approach is browser-safe and doesn't rely on process.env directly.
 */
function safeGetConfig(key: string, fallback: string): string {
  try {
    // Check for window.__RUNTIME_CONFIG__ (populated by shell app)
    if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
      const value = (window.__RUNTIME_CONFIG__ as Record<string, string | undefined>)[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Get number configuration value safely.
 */
function safeGetNumberConfig(key: string, fallback: number): number {
  const value = safeGetConfig(key, String(fallback));
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Load and validate financial configuration.
 * Uses safe defaults that work in all browser contexts.
 * Configuration values come from window.__RUNTIME_CONFIG__ when available.
 */
export function getFinancialConfig(): FinancialConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Use safe defaults that work in all browser contexts
  // When running through the shell app, window.__RUNTIME_CONFIG__ will be populated
  const config = FinancialConfigSchema.safeParse({
    enabled: safeGetConfig('REACT_APP_FEATURE_FINANCIAL_ANALYSIS_ENABLED', 'true'),
    refreshIntervalMs: safeGetNumberConfig('REACT_APP_REQUEST_TIMEOUT_MS', 30000),
    currencyCode: 'USD',
    currencyLocale: 'en-US',
  });

  if (!config.success) {
    console.error('Financial configuration validation failed:', config.error.format());
    throw new Error(
      `Financial configuration validation failed. Missing or invalid values: ${Object.keys(config.error.flatten().fieldErrors).join(', ')}`
    );
  }

  cachedConfig = config.data;
  return cachedConfig;
}

/**
 * Check if financial analysis feature is enabled.
 * Returns false if configuration fails (graceful degradation for optional feature).
 */
export function isFinancialAnalysisEnabled(): boolean {
  try {
    const config = getFinancialConfig();
    return config.enabled;
  } catch {
    return false;
  }
}

/**
 * Reset cached configuration (for testing purposes).
 */
export function resetFinancialConfigCache(): void {
  cachedConfig = null;
}
