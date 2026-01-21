import { logger } from 'firebase-functions';

/**
 * Error Helper Utilities
 * 
 * Common error handling and manipulation functions.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import type { ErrorCategory, ErrorSeverity } from '../types';
import type { BaseError } from '../types/error';

export function createError(
  code: string,
  message: string,
  category: ErrorCategory,
  severity: ErrorSeverity,
  details?: Record<string, any>
): BaseError {
  const error: BaseError = {
    code,
    message,
    category,
    severity,
    timestamp: Date.now(),
    stack: new Error().stack
  };

  if (details) {
    error.details = details;
  }

  return error;
}

export function isErrorWithCode(error: unknown, code: string): boolean {
  return isBaseError(error) && error.code === code;
}

export function isBaseError(error: unknown): error is BaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'category' in error &&
    'severity' in error
  );
}

export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (isBaseError(error)) return error.message;
  return 'Unknown error occurred';
}

export function logError(error: BaseError): void {
  logger.error(`[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`, {
    category: error.category,
    timestamp: error.timestamp,
    details: error.details,
    stack: error.stack
  });
}

export function sanitizeErrorForClient(error: BaseError): Partial<BaseError> {
  return {
    code: error.code,
    message: error.message,
    category: error.category,
    severity: error.severity,
    timestamp: error.timestamp
    // Exclude sensitive data like stack traces, details, etc.
  };
}