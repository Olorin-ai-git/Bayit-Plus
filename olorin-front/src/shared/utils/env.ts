/**
 * Environment Variable Utility Helpers
 * Feature: 005-polling-and-persistence
 *
 * SYSTEM MANDATE Compliance:
 * - Type-safe environment variable access
 * - No hardcoded defaults
 * - Fail-fast on missing required values
 */

/**
 * Get environment variable value.
 * Returns undefined if not set.
 */
export function getEnv(key: string): string | undefined {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      const value = process.env[key];
      if (value === 'undefined' || value === undefined) {
        return undefined;
      }
      return value;
    }
  } catch (e) {
    // Process access failed
  }

  try {
    const windowEnv = (window as any).__ENV__;
    if (windowEnv && windowEnv[key]) {
      return windowEnv[key];
    }
  } catch (e) {
    // Window access failed
  }

  return undefined;
}

/**
 * Get environment variable value with a default.
 */
export function getEnvOrDefault(key: string, defaultValue: string): string {
  return getEnv(key) ?? defaultValue;
}

/**
 * Get required environment variable.
 * Throws error if not set.
 */
export function getRequiredEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Parse environment variable as number.
 * Throws error if not a valid number.
 */
export function getEnvAsNumber(key: string): number {
  const value = getRequiredEnv(key);
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }
  return parsed;
}

/**
 * Parse environment variable as number with default.
 */
export function getEnvAsNumberOrDefault(key: string, defaultValue: number): number {
  const value = getEnv(key);
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as boolean.
 * Throws error if not a valid boolean.
 */
export function getEnvAsBoolean(key: string): boolean {
  const value = getRequiredEnv(key);
  const normalized = value.toLowerCase();
  if (normalized !== 'true' && normalized !== 'false') {
    throw new Error(`Environment variable ${key} must be 'true' or 'false', got: ${value}`);
  }
  return normalized === 'true';
}

/**
 * Parse environment variable as boolean with default.
 */
export function getEnvAsBooleanOrDefault(key: string, defaultValue: boolean): boolean {
  const value = getEnv(key);
  if (!value) return defaultValue;

  return value.toLowerCase() === 'true';
}

/**
 * Check if running in development mode.
 */
export function isDevelopment(): boolean {
  return getEnv('NODE_ENV') === 'development';
}

/**
 * Check if running in production mode.
 */
export function isProduction(): boolean {
  return getEnv('NODE_ENV') === 'production';
}

/**
 * Check if running in test mode.
 */
export function isTest(): boolean {
  return getEnv('NODE_ENV') === 'test';
}
