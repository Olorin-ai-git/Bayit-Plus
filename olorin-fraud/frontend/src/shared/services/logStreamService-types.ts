/**
 * Log Stream Service Types
 * Feature: 021-live-merged-logstream
 *
 * Type definitions and error classes for log stream service.
 * Extracted from logStreamService.ts to maintain 200-line limit.
 *
 * Author: Gil Klainert
 * Date: 2025-11-12
 * Spec: /specs/021-live-merged-logstream/api-contracts.md
 */

/**
 * Response from client logs ingestion endpoint
 */
export interface LogIngestionResponse {
  received: number;
  processed: number;
  failed: number;
  errors?: Array<{
    index: number;
    message: string;
  }>;
}

/**
 * Log ingestion error
 */
export class LogIngestionError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: LogIngestionResponse
  ) {
    super(message);
    this.name = 'LogIngestionError';
  }
}
