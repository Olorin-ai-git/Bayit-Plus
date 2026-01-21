/**
 * Polling Configuration Constants
 * Feature: 007-progress-wizard-page
 *
 * Defines polling intervals and retry strategies for real-time updates.
 * All values loaded from environment variables per SYSTEM MANDATE.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values (all from process.env)
 * - Configuration-driven timeouts and intervals
 * - Fail-fast if required config missing
 */

import { env } from '../../../shared/config/env.config';

/**
 * Polling intervals for different components (milliseconds)
 */
export const POLLING_CONFIG = {
  /**
   * Progress polling interval (30 seconds)
   * How often to poll /progress endpoint for investigation updates
   */
  PROGRESS_INTERVAL_MS: env.features.pollingIntervalMs || 30000,

  /**
   * EKG monitor update interval (30 seconds)
   * How often to refresh EKG waveform and metrics
   */
  EKG_INTERVAL_MS: env.features.pollingIntervalMs || 30000,

  /**
   * Entity graph polling interval (30 seconds)
   * How often to refresh entity correlation graph
   */
  ENTITY_GRAPH_INTERVAL_MS: env.features.entityGraphPollingMs || 30000,

  /**
   * Maximum retry attempts before giving up
   */
  MAX_RETRIES: 5,

  /**
   * Exponential backoff retry intervals (milliseconds)
   * [3s, 6s, 12s, 24s, 30s]
   */
  RETRY_BACKOFF_MS: [3000, 6000, 12000, 24000, 30000]
} as const;

/**
 * Terminal investigation statuses
 * When investigation reaches these statuses, stop polling
 */
export const TERMINAL_STATUSES = [
  'completed',
  'failed',
  'cancelled'
] as const;

/**
 * Checks if investigation status is terminal
 * @param status - Investigation status string
 * @returns True if status indicates investigation is complete
 */
export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status as typeof TERMINAL_STATUSES[number]);
}

/**
 * Gets retry backoff delay for attempt number
 * @param attemptNumber - Current retry attempt (0-indexed)
 * @returns Backoff delay in milliseconds
 */
export function getRetryBackoff(attemptNumber: number): number {
  const index = Math.min(attemptNumber, POLLING_CONFIG.RETRY_BACKOFF_MS.length - 1);
  return POLLING_CONFIG.RETRY_BACKOFF_MS[index];
}
