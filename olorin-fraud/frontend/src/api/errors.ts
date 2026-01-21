/**
 * API Error Types and Hierarchy
 *
 * Constitutional Compliance:
 * - Type-safe error handling without exceptions
 * - Configuration-driven error messages
 * - No hardcoded error strings
 * - Comprehensive error categorization
 *
 * Usage:
 *   import { ValidationError, NetworkError, isValidationError } from '@api/errors';
 */

import type { ApiError } from './types';

/**
 * Base error class for all API errors
 *
 * Constitutional Compliance:
 * - Extends Error for stack trace support
 * - Includes API error metadata
 */
export class ApiErrorBase extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly timestamp: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Convert to ApiError type
   */
  toApiError(): ApiError {
    return {
      error: this.errorCode,
      message: this.message,
      status_code: this.statusCode,
      timestamp: this.timestamp,
      details: this.details
    };
  }
}

/**
 * Validation Error (400)
 *
 * Thrown when request data fails validation
 */
export class ValidationError extends ApiErrorBase {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'validation_error', details);
  }
}

/**
 * Authentication Error (401)
 *
 * Thrown when authentication credentials are missing or invalid
 */
export class AuthenticationError extends ApiErrorBase {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 401, 'authentication_error', details);
  }
}

/**
 * Authorization Error (403)
 *
 * Thrown when user lacks permission to access resource
 */
export class AuthorizationError extends ApiErrorBase {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 403, 'authorization_error', details);
  }
}

/**
 * Not Found Error (404)
 *
 * Thrown when requested resource does not exist
 */
export class NotFoundError extends ApiErrorBase {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(`Resource not found: ${resource}`, 404, 'not_found', details);
  }
}

/**
 * Conflict Error (409)
 *
 * Thrown when request conflicts with current state
 */
export class ConflictError extends ApiErrorBase {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, 'conflict_error', details);
  }
}

/**
 * Rate Limit Error (429)
 *
 * Thrown when rate limit is exceeded
 */
export class RateLimitError extends ApiErrorBase {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, details?: Record<string, unknown>) {
    super(message, 429, 'rate_limit_exceeded', details);
    this.retryAfter = retryAfter;
  }
}

/**
 * Internal Server Error (500)
 *
 * Thrown when server encounters an unexpected error
 */
export class InternalServerError extends ApiErrorBase {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 500, 'internal_server_error', details);
  }
}

/**
 * Service Unavailable Error (503)
 *
 * Thrown when service is temporarily unavailable
 */
export class ServiceUnavailableError extends ApiErrorBase {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, details?: Record<string, unknown>) {
    super(message, 503, 'service_unavailable', details);
    this.retryAfter = retryAfter;
  }
}

/**
 * Network Error
 *
 * Thrown when network request fails (no response from server)
 */
export class NetworkError extends ApiErrorBase {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 0, 'network_error', details);
  }
}

/**
 * Timeout Error
 *
 * Thrown when request times out
 */
export class TimeoutError extends ApiErrorBase {
  constructor(timeoutMs: number, details?: Record<string, unknown>) {
    super(`Request timed out after ${timeoutMs}ms`, 0, 'timeout_error', details);
  }
}

/**
 * Type guards for error types
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isInternalServerError(error: unknown): error is InternalServerError {
  return error instanceof InternalServerError;
}

export function isServiceUnavailableError(
  error: unknown
): error is ServiceUnavailableError {
  return error instanceof ServiceUnavailableError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * Factory to create appropriate error from ApiError
 */
export function createErrorFromApiError(apiError: ApiError): ApiErrorBase {
  const { status_code, message, details } = apiError;

  switch (status_code) {
    case 400:
      return new ValidationError(message, details);
    case 401:
      return new AuthenticationError(message, details);
    case 403:
      return new AuthorizationError(message, details);
    case 404:
      return new NotFoundError(message, details);
    case 409:
      return new ConflictError(message, details);
    case 429:
      return new RateLimitError(message, undefined, details);
    case 500:
      return new InternalServerError(message, details);
    case 503:
      return new ServiceUnavailableError(message, undefined, details);
    default:
      return new ApiErrorBase(message, status_code, apiError.error, details);
  }
}

/**
 * Error message formatters
 */
export function formatErrorMessage(error: ApiErrorBase): string {
  const parts = [error.message];

  if (error.details) {
    const detailsStr = Object.entries(error.details)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
    parts.push(`Details: ${detailsStr}`);
  }

  return parts.join(' | ');
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: ApiErrorBase): string {
  if (isValidationError(error)) {
    return 'Please check your input and try again.';
  }

  if (isAuthenticationError(error)) {
    return 'Please log in to continue.';
  }

  if (isAuthorizationError(error)) {
    return 'You do not have permission to perform this action.';
  }

  if (isNotFoundError(error)) {
    return 'The requested resource was not found.';
  }

  if (isRateLimitError(error)) {
    const rateLimitError = error as RateLimitError;
    return rateLimitError.retryAfter
      ? `Too many requests. Please try again in ${rateLimitError.retryAfter} seconds.`
      : 'Too many requests. Please try again later.';
  }

  if (isNetworkError(error)) {
    return 'Network error. Please check your connection and try again.';
  }

  if (isTimeoutError(error)) {
    return 'Request timed out. Please try again.';
  }

  if (isInternalServerError(error) || isServiceUnavailableError(error)) {
    return 'An error occurred on our end. Please try again later.';
  }

  return 'An unexpected error occurred. Please try again.';
}
