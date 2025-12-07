/**
 * Financial Configuration
 * Feature: 025-financial-analysis-frontend
 *
 * Configuration schema and loader for financial analysis features.
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
 * Load and validate financial configuration from environment variables.
 * Fails fast if configuration is invalid or missing.
 */
export function getFinancialConfig(): FinancialConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config = FinancialConfigSchema.safeParse({
    enabled: process.env.REACT_APP_FEATURE_FINANCIAL_ANALYSIS_ENABLED,
    refreshIntervalMs: process.env.REACT_APP_FINANCIAL_REFRESH_INTERVAL_MS,
    currencyCode: process.env.REACT_APP_FINANCIAL_CURRENCY_CODE,
    currencyLocale: process.env.REACT_APP_FINANCIAL_CURRENCY_LOCALE,
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
