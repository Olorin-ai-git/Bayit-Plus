/**
 * Polling Configuration Validation
 * Feature: 007-progress-wizard-page
 *
 * Validates polling intervals and configuration at startup
 * Implements fail-fast validation per SYSTEM MANDATE
 */

import { POLLING_CONFIG } from '../constants/pollingConfig';

interface PollingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates polling configuration values
 * Ensures all intervals are within acceptable ranges for production
 */
export function validatePollingConfig(): PollingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate progress polling interval (1000-60000ms)
  if (!POLLING_CONFIG.PROGRESS_INTERVAL_MS) {
    errors.push('PROGRESS_INTERVAL_MS is not configured');
  } else if (POLLING_CONFIG.PROGRESS_INTERVAL_MS < 1000) {
    errors.push(
      `PROGRESS_INTERVAL_MS (${POLLING_CONFIG.PROGRESS_INTERVAL_MS}ms) is below minimum (1000ms). ` +
      'This could cause excessive backend load.'
    );
  } else if (POLLING_CONFIG.PROGRESS_INTERVAL_MS > 60000) {
    warnings.push(
      `PROGRESS_INTERVAL_MS (${POLLING_CONFIG.PROGRESS_INTERVAL_MS}ms) exceeds recommended maximum (60000ms). ` +
      'Users may experience delayed progress updates.'
    );
  }

  // Validate EKG polling interval
  if (!POLLING_CONFIG.EKG_INTERVAL_MS) {
    errors.push('EKG_INTERVAL_MS is not configured');
  } else if (POLLING_CONFIG.EKG_INTERVAL_MS < 1000) {
    errors.push(
      `EKG_INTERVAL_MS (${POLLING_CONFIG.EKG_INTERVAL_MS}ms) is below minimum (1000ms). ` +
      'This could cause excessive backend load.'
    );
  }

  // Validate entity graph polling interval
  if (!POLLING_CONFIG.ENTITY_GRAPH_INTERVAL_MS) {
    errors.push('ENTITY_GRAPH_INTERVAL_MS is not configured');
  } else if (POLLING_CONFIG.ENTITY_GRAPH_INTERVAL_MS < 5000) {
    warnings.push(
      `ENTITY_GRAPH_INTERVAL_MS (${POLLING_CONFIG.ENTITY_GRAPH_INTERVAL_MS}ms) is below recommended minimum (5000ms). ` +
      'This could cause performance issues.'
    );
  }

  // Validate max retries
  if (!POLLING_CONFIG.MAX_RETRIES || POLLING_CONFIG.MAX_RETRIES < 1) {
    errors.push('MAX_RETRIES must be configured and >= 1');
  } else if (POLLING_CONFIG.MAX_RETRIES > 10) {
    warnings.push(
      `MAX_RETRIES (${POLLING_CONFIG.MAX_RETRIES}) exceeds recommended maximum (10). ` +
      'This could cause excessive retry attempts.'
    );
  }

  // Validate retry backoff array
  if (!POLLING_CONFIG.RETRY_BACKOFF_MS || POLLING_CONFIG.RETRY_BACKOFF_MS.length === 0) {
    errors.push('RETRY_BACKOFF_MS must be configured with at least one value');
  } else {
    // Check that backoff values are in ascending order
    for (let i = 1; i < POLLING_CONFIG.RETRY_BACKOFF_MS.length; i++) {
      if (POLLING_CONFIG.RETRY_BACKOFF_MS[i] < POLLING_CONFIG.RETRY_BACKOFF_MS[i - 1]) {
        warnings.push(
          `RETRY_BACKOFF_MS values are not in ascending order. ` +
          'Expected ascending order for exponential backoff strategy.'
        );
        break;
      }
    }

    // Check first backoff value
    if (POLLING_CONFIG.RETRY_BACKOFF_MS[0] < POLLING_CONFIG.PROGRESS_INTERVAL_MS) {
      warnings.push(
        'First RETRY_BACKOFF_MS value should be >= PROGRESS_INTERVAL_MS for consistency'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Fail-fast validation at application startup
 * Throws error if configuration is invalid
 */
export function ensurePollingConfigIsValid(): void {
  const validation = validatePollingConfig();

  if (!validation.isValid) {
    const errorMessage = [
      'Polling configuration validation failed:',
      ...validation.errors.map(e => `  ✗ ${e}`)
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && validation.warnings.length > 0) {
    console.warn(
      'Polling configuration warnings:\n' +
      validation.warnings.map(w => `  ⚠ ${w}`).join('\n')
    );
  }
}

/**
 * Get adaptive polling interval based on retry count
 * Implements exponential backoff for error handling
 */
export function getAdaptivePollingInterval(
  baseInterval: number,
  consecutiveErrors: number
): number {
  if (consecutiveErrors === 0) {
    return baseInterval;
  }

  // Use retry backoff if within bounds, otherwise cap at last backoff value
  const backoffIndex = Math.min(consecutiveErrors - 1, POLLING_CONFIG.RETRY_BACKOFF_MS.length - 1);
  return POLLING_CONFIG.RETRY_BACKOFF_MS[backoffIndex];
}
