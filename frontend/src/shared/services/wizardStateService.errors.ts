/**
 * Wizard State Service Error Types
 * Feature: 005-polling-and-persistence
 * Task: T020 - Custom error classes for wizard state operations
 *
 * SYSTEM MANDATE Compliance:
 * - Complete error type definitions
 * - No placeholders or TODOs
 * - Type-safe error handling
 */

import { AxiosError } from 'axios';

/**
 * Base error class for wizard state operations.
 */
export class WizardStateError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'WizardStateError';
    Object.setPrototypeOf(this, WizardStateError.prototype);
  }

  /**
   * Check if error is retryable based on status code.
   */
  isRetryable(): boolean {
    if (!this.statusCode) return false;
    const retryableCodes = ['NETWORK_ERROR'];
    if (retryableCodes.includes(this.code)) return true;
    return this.statusCode >= 500;
  }
}

/**
 * Version conflict error for optimistic locking failures.
 */
export class VersionConflictError extends WizardStateError {
  constructor(
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
    public readonly serverState?: unknown
  ) {
    super(
      `Version conflict: expected ${expectedVersion}, got ${actualVersion}. State was modified by another request.`,
      'VERSION_CONFLICT',
      409,
      { expectedVersion, actualVersion, hasServerState: !!serverState }
    );
    this.name = 'VersionConflictError';
    Object.setPrototypeOf(this, VersionConflictError.prototype);
  }

  isRetryable(): boolean {
    return false;
  }
}

/**
 * State not found error.
 */
export class StateNotFoundError extends WizardStateError {
  constructor(public readonly investigationId: string) {
    super(
      `Wizard state not found: ${investigationId}`,
      'NOT_FOUND',
      404,
      { investigationId }
    );
    this.name = 'StateNotFoundError';
    Object.setPrototypeOf(this, StateNotFoundError.prototype);
  }

  isRetryable(): boolean {
    return false;
  }
}

/**
 * Validation error for invalid state data.
 */
export class ValidationError extends WizardStateError {
  constructor(message: string, public readonly validationErrors?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400, { validationErrors });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  isRetryable(): boolean {
    return false;
  }

  getAllErrors(): string[] {
    if (!this.validationErrors) return [];
    return Object.values(this.validationErrors).flat();
  }
}

/**
 * Network error for connection failures.
 */
export class NetworkError extends WizardStateError {
  constructor(message: string, public readonly originalError?: Error) {
    super(message, 'NETWORK_ERROR', 0, {
      originalErrorMessage: originalError?.message,
      originalErrorName: originalError?.name
    });
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  isRetryable(): boolean {
    return true;
  }
}

/**
 * Transform Axios errors into appropriate WizardStateError types.
 */
export function handleAxiosError(error: AxiosError, defaultMessage: string): WizardStateError {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as any;

    if (status === 404) {
      return new StateNotFoundError(data.investigation_id || 'unknown');
    }

    if (status === 400) {
      return new ValidationError(data.message || defaultMessage, data.details);
    }

    if (status === 409) {
      // Check if this is actually a version conflict or another 409 error
      if (data.detail && typeof data.detail === 'string') {
        if (data.detail.includes('Version conflict')) {
          // Extract version numbers from message like "Version conflict: expected 1, got 0"
          const match = data.detail.match(/expected (\d+), got (\d+)/);
          if (match) {
            return new VersionConflictError(
              parseInt(match[1], 10),
              parseInt(match[2], 10),
              data.server_state
            );
          }
        } else if (data.detail.includes('already exists')) {
          // This is a duplicate investigation error, not a version conflict
          return new WizardStateError(
            data.detail,
            'DUPLICATE_INVESTIGATION',
            409,
            { detail: data.detail }
          );
        }
      }
      // Fallback for structured error response
      return new VersionConflictError(
        data.expected_version || 0,
        data.actual_version || 0,
        data.server_state
      );
    }

    return new WizardStateError(
      data.message || defaultMessage,
      data.error || 'API_ERROR',
      status,
      data.details
    );
  }

  if (error.request) {
    return new NetworkError('No response received from server', error);
  }

  return new WizardStateError(error.message || defaultMessage, 'UNKNOWN_ERROR');
}
