/**
 * API Configuration for Olorin Frontend
 *
 * Constitutional Compliance:
 * - All configuration from environment variables (no hardcoded URLs or values)
 * - Zod schema validation with fail-fast behavior
 * - No defaults for required values (fail if missing)
 * - Environment-specific configuration support
 */

import { z } from 'zod';

/**
 * API Configuration Schema
 *
 * Constitutional Compliance:
 * - URL validation ensures proper format
 * - Timeouts are configurable (no hardcoded values)
 * - Environment validation with enum
 */
export const ApiConfigSchema = z.object({
  env: z.enum(['production', 'staging', 'development'], {
    errorMap: () => ({ message: 'REACT_APP_ENV must be "production", "staging", or "development"' })
  }),
  apiBaseUrl: z.string().url({
    message: 'REACT_APP_API_BASE_URL must be a valid URL'
  }),
  requestTimeoutMs: z.coerce.number().int().positive({
    message: 'REACT_APP_REQUEST_TIMEOUT_MS must be a positive integer'
  }),
  retryAttempts: z.coerce.number().int().min(0).max(5).default(3),
  retryDelayMs: z.coerce.number().int().positive().default(1000),
  paginationSize: z.coerce.number().int().positive().default(20),
  cacheMaxEntries: z.coerce.number().int().positive().default(100),
  cacheTtlMs: z.coerce.number().int().positive().default(300000)
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

/**
 * Load and validate API configuration from environment variables
 *
 * Constitutional Compliance:
 * - Reads all values from process.env (no hardcoded values)
 * - Fails fast if configuration is invalid
 * - Clear error messages for missing/invalid configuration
 *
 * @returns Validated API configuration
 * @throws Error if configuration is invalid or missing required values
 */
export function loadApiConfig(): ApiConfig {
  const config = {
    env: process.env['REACT_APP_ENV'],
    apiBaseUrl: process.env['REACT_APP_API_BASE_URL'],
    requestTimeoutMs: process.env['REACT_APP_REQUEST_TIMEOUT_MS'],
    retryAttempts: process.env['REACT_APP_RETRY_ATTEMPTS'],
    retryDelayMs: process.env['REACT_APP_RETRY_DELAY_MS'],
    paginationSize: process.env['REACT_APP_PAGINATION_SIZE'],
    cacheMaxEntries: process.env['REACT_APP_CACHE_MAX_ENTRIES'],
    cacheTtlMs: process.env['REACT_APP_CACHE_TTL_MS']
  };

  const parsed = ApiConfigSchema.safeParse(config);

  if (!parsed.success) {
    const errors = parsed.error.format();
    console.error('❌ Invalid API configuration:', errors);
    throw new Error(
      `Invalid API configuration – refusing to start. ` +
      `Please check your environment variables. ` +
      `Errors: ${JSON.stringify(errors, null, 2)}`
    );
  }

  return parsed.data;
}

/**
 * Get singleton instance of API configuration
 *
 * Constitutional Compliance:
 * - Configuration loaded once and reused
 * - Fail-fast behavior on first access
 */
let apiConfigInstance: ApiConfig | null = null;

export function getApiConfig(): ApiConfig {
  if (!apiConfigInstance) {
    apiConfigInstance = loadApiConfig();
  }
  return apiConfigInstance;
}

/**
 * Reset configuration instance (useful for testing)
 *
 * @internal
 */
export function resetApiConfig(): void {
  apiConfigInstance = null;
}
