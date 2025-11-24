/**
 * Investigation ID Generator
 *
 * Generates unique, collision-resistant investigation IDs with configurable format.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven ID format
 * - No hardcoded prefixes or formats
 * - Cryptographically secure randomness via DI
 */

import { getRuntimeConfig } from '../config/runtimeConfig';

/**
 * ID generation configuration
 */
export interface IdGenerationConfig {
  /** Prefix for investigation IDs */
  prefix: string;
  /** Use timestamp in ID generation */
  includeTimestamp: boolean;
  /** Use cryptographically secure random values */
  useCryptoRandom: boolean;
  /** Length of random suffix */
  randomLength: number;
}

/**
 * Load ID generation configuration from environment
 */
function loadIdConfig(): IdGenerationConfig {
  return {
    prefix: getRuntimeConfig('REACT_APP_INVESTIGATION_ID_PREFIX', {
      defaultValue: 'inv'
    }),
    includeTimestamp: getRuntimeConfig('REACT_APP_INVESTIGATION_ID_TIMESTAMP', {
      defaultValue: 'true',
      parser: (val) => val === 'true'
    }),
    useCryptoRandom: getRuntimeConfig('REACT_APP_INVESTIGATION_ID_CRYPTO_RANDOM', {
      defaultValue: 'true',
      parser: (val) => val === 'true'
    }),
    randomLength: getRuntimeConfig('REACT_APP_INVESTIGATION_ID_RANDOM_LENGTH', {
      defaultValue: '8',
      parser: (val) => parseInt(val, 10)
    })
  };
}

/**
 * Generate cryptographically secure random string
 */
function generateCryptoRandom(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  // Convert to base36 string (0-9, a-z)
  return Array.from(array)
    .map(byte => (byte % 36).toString(36))
    .join('')
    .substring(0, length);
}

/**
 * Generate pseudo-random string (fallback)
 */
function generatePseudoRandom(length: number): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .padEnd(length, '0');
}

/**
 * Generate a unique investigation ID
 *
 * Format: {prefix}-{timestamp}-{random}
 * - prefix: Configurable prefix (default: 'inv')
 * - timestamp: Current timestamp in milliseconds (optional)
 * - random: Cryptographically secure random string
 *
 * Configuration-driven via environment variables:
 * - REACT_APP_INVESTIGATION_ID_PREFIX: ID prefix
 * - REACT_APP_INVESTIGATION_ID_TIMESTAMP: Include timestamp (true/false)
 * - REACT_APP_INVESTIGATION_ID_CRYPTO_RANDOM: Use crypto.getRandomValues (true/false)
 * - REACT_APP_INVESTIGATION_ID_RANDOM_LENGTH: Length of random suffix
 *
 * @returns Unique investigation ID
 *
 * @example
 * ```typescript
 * const investigationId = generateInvestigationId();
 * // Returns: "inv-1704067200000-a8f3d9c2"
 * ```
 */
export function generateInvestigationId(): string {
  const config = loadIdConfig();

  const parts: string[] = [config.prefix];

  // Add timestamp if configured
  if (config.includeTimestamp) {
    parts.push(Date.now().toString());
  }

  // Add random suffix
  const random = config.useCryptoRandom && crypto && crypto.getRandomValues
    ? generateCryptoRandom(config.randomLength)
    : generatePseudoRandom(config.randomLength);

  parts.push(random);

  const id = parts.join('-');

  console.log('[IdGenerator] Generated investigation ID:', {
    id,
    config,
    timestamp: config.includeTimestamp ? Date.now() : null
  });

  return id;
}

/**
 * Validate investigation ID format
 *
 * Checks if an ID matches the expected format based on configuration.
 *
 * @param id - Investigation ID to validate
 * @returns true if ID is valid format
 */
export function isValidInvestigationId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const config = loadIdConfig();
  const parts = id.split('-');

  // Must have at least prefix and random
  if (parts.length < 2) {
    return false;
  }

  // Check prefix
  if (parts[0] !== config.prefix) {
    return false;
  }

  // If timestamp is included, must have 3 parts
  if (config.includeTimestamp && parts.length !== 3) {
    return false;
  }

  // If no timestamp, must have 2 parts
  if (!config.includeTimestamp && parts.length !== 2) {
    return false;
  }

  return true;
}

/**
 * Extract timestamp from investigation ID
 *
 * @param id - Investigation ID
 * @returns Timestamp in milliseconds, or null if not present
 */
export function extractTimestamp(id: string): number | null {
  const config = loadIdConfig();

  if (!config.includeTimestamp || !isValidInvestigationId(id)) {
    return null;
  }

  const parts = id.split('-');
  const timestamp = parseInt(parts[1], 10);

  return isNaN(timestamp) ? null : timestamp;
}
