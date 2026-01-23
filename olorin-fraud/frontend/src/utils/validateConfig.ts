/**
 * Configuration Validation Utility
 *
 * ZERO TOLERANCE: No fallbacks, no defaults, no silent failures.
 * All configuration must be explicitly set via environment variables.
 *
 * @module utils/validateConfig
 */

interface RequiredEnvVar {
  name: string;
  description: string;
  example: string;
  validator?: (value: string) => boolean;
}

const REQUIRED_ENV_VARS: RequiredEnvVar[] = [
  {
    name: 'REACT_APP_API_BASE_URL',
    description: 'Backend API base URL',
    example: 'https://api.olorin-fraud.com',
    validator: (value) => {
      try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
      } catch {
        return false;
      }
    },
  },
  {
    name: 'REACT_APP_WS_URL',
    description: 'WebSocket URL for real-time updates',
    example: 'wss://api.olorin-fraud.com',
    validator: (value) => {
      try {
        const url = new URL(value);
        return ['ws:', 'wss:'].includes(url.protocol);
      } catch {
        return false;
      }
    },
  },
  {
    name: 'REACT_APP_ENV',
    description: 'Application environment',
    example: 'production',
    validator: (value) => ['development', 'staging', 'production'].includes(value),
  },
];

/**
 * Validate all required environment variables at application startup.
 *
 * CRITICAL: This function throws an error if any required variable is missing
 * or invalid. There are NO fallbacks, NO defaults.
 *
 * @throws {Error} If any required environment variable is missing or invalid
 */
export function validateConfig(): void {
  const errors: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      errors.push(
        `❌ ${envVar.name} is not set.\n` +
        `   Description: ${envVar.description}\n` +
        `   Example: ${envVar.name}=${envVar.example}`
      );
      continue;
    }

    if (envVar.validator && !envVar.validator(value)) {
      errors.push(
        `❌ ${envVar.name} is invalid: "${value}"\n` +
        `   Example: ${envVar.name}=${envVar.example}`
      );
    }
  }

  if (errors.length > 0) {
    const errorMessage =
      '🚨 CONFIGURATION ERROR - APPLICATION CANNOT START\n\n' +
      errors.join('\n\n') +
      '\n\nSet these in your .env file. See .env.example for template.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log('✅ Configuration validation passed');
}

/**
 * Get required environment variable with fail-fast behavior.
 *
 * Use this function when you need a specific env var at runtime.
 * NO fallbacks are allowed.
 *
 * @param name Environment variable name
 * @param description Human-readable description
 * @returns The environment variable value
 * @throws {Error} If the variable is not set
 */
export function getRequiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `CRITICAL: ${name} is not set.\n` +
      `Description: ${description}\n` +
      `Set it in your .env file.`
    );
  }
  return value;
}

/**
 * Get required URL environment variable with validation.
 *
 * @param name Environment variable name
 * @param description Human-readable description
 * @param allowedProtocols Allowed URL protocols (default: ['http:', 'https:'])
 * @returns The validated URL
 * @throws {Error} If the variable is not set or invalid
 */
export function getRequiredUrl(
  name: string,
  description: string,
  allowedProtocols: string[] = ['http:', 'https:']
): string {
  const value = getRequiredEnv(name, description);

  try {
    const url = new URL(value);
    if (!allowedProtocols.includes(url.protocol)) {
      throw new Error(
        `Invalid protocol "${url.protocol}". ` +
        `Allowed: ${allowedProtocols.join(', ')}`
      );
    }
    return value;
  } catch (error) {
    throw new Error(
      `CRITICAL: ${name} is not a valid URL: "${value}"\n` +
      `Description: ${description}\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get optional environment variable with typed default.
 *
 * Use this only for truly optional configuration like feature flags,
 * NOT for URLs or API endpoints.
 *
 * @param name Environment variable name
 * @param defaultValue Default value if not set
 * @returns The environment variable value or default
 */
export function getOptionalEnv<T extends string | number | boolean>(
  name: string,
  defaultValue: T
): T {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  // Type coercion based on default value type
  if (typeof defaultValue === 'number') {
    const parsed = parseInt(value, 10);
    return (isNaN(parsed) ? defaultValue : parsed) as T;
  }

  if (typeof defaultValue === 'boolean') {
    return (value.toLowerCase() === 'true') as T;
  }

  return value as T;
}
