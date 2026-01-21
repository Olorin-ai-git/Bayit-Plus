/**
 * Log Stream Service
 * Feature: 021-live-merged-logstream
 *
 * API client for sending frontend logs to backend for merged streaming.
 * Handles batching, error recovery, and configuration-driven endpoints.
 *
 * Author: Gil Klainert
 * Date: 2025-11-12
 * Spec: /specs/021-live-merged-logstream/api-contracts.md
 */

import { UnifiedLogCreate } from '../types/unified-log';
import { getClientLogsEndpoint } from '../../config/logstream-config';
import { getConfig } from '../config/env.config';
import { LogIngestionResponse, LogIngestionError } from './logStreamService-types';
import { retryWithBackoff, isClientError } from '../utils/retry-utils';

/**
 * Log stream service for sending frontend logs to backend
 *
 * Provides methods for:
 * - Batch log ingestion
 * - Single log ingestion
 * - Error handling with retry logic
 */
export class LogStreamService {
  private readonly apiBaseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    const config = getConfig();
    this.apiBaseUrl = config.api.baseUrl;
    this.timeoutMs = config.api.requestTimeoutMs;
  }

  /**
   * Send batch of logs to backend for ingestion
   *
   * @param logs - Array of UnifiedLogCreate entries to send
   * @returns Response with ingestion statistics
   * @throws LogIngestionError if request fails
   */
  async ingestLogs(logs: UnifiedLogCreate[]): Promise<LogIngestionResponse> {
    if (logs.length === 0) {
      return {
        received: 0,
        processed: 0,
        failed: 0
      };
    }

    const endpoint = getClientLogsEndpoint(this.apiBaseUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logs }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new LogIngestionError(
          `Log ingestion failed: ${response.statusText}`,
          response.status
        );
      }

      const result: LogIngestionResponse = await response.json();
      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof LogIngestionError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new LogIngestionError(
            `Log ingestion timed out after ${this.timeoutMs}ms`
          );
        }

        throw new LogIngestionError(
          `Log ingestion network error: ${error.message}`
        );
      }

      throw new LogIngestionError('Unknown log ingestion error');
    }
  }

  /**
   * Send single log to backend for ingestion
   *
   * Convenience method for single log entries.
   * Uses same endpoint as batch ingestion.
   *
   * @param log - Single UnifiedLogCreate entry
   * @returns Response with ingestion statistics
   */
  async ingestLog(log: UnifiedLogCreate): Promise<LogIngestionResponse> {
    return this.ingestLogs([log]);
  }

  /**
   * Attempt to send logs with automatic retry on failure
   *
   * Retries transient errors (network, timeout) but not client errors (400).
   *
   * @param logs - Array of logs to send
   * @param maxRetries - Maximum retry attempts (default: 3)
   * @param retryDelayMs - Delay between retries (default: 1000ms)
   * @returns Response with ingestion statistics
   * @throws LogIngestionError if all retries exhausted
   */
  async ingestLogsWithRetry(
    logs: UnifiedLogCreate[],
    maxRetries: number = 3,
    retryDelayMs: number = 1000
  ): Promise<LogIngestionResponse> {
    return retryWithBackoff(
      () => this.ingestLogs(logs),
      maxRetries,
      retryDelayMs,
      (error) => !isClientError(error)
    );
  }
}

/**
 * Singleton instance of log stream service
 */
let logStreamServiceInstance: LogStreamService | null = null;

/**
 * Get or create log stream service instance
 */
export function getLogStreamService(): LogStreamService {
  if (!logStreamServiceInstance) {
    logStreamServiceInstance = new LogStreamService();
  }
  return logStreamServiceInstance;
}

/**
 * Reset log stream service instance (for testing)
 */
export function resetLogStreamService(): void {
  logStreamServiceInstance = null;
}
