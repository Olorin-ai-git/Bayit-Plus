import { logger } from 'firebase-functions';

/**
 * Error Utilities
 * 
 * Authentication error creation and handling utilities.
 * Integrates with Core error handling when available for consistency.
  */

import type { AuthError, AuthErrorCode, AuthErrorContext } from '../types';
import { DEFAULT_ERROR_MESSAGES } from '../types/error.types';

// Import Core error utilities when available
let CVAuthenticationError: any = null;
let handleError: any = null;
let createErrorContext: any = null;

try {
  const coreUtils = require('@cvplus/core');
  CVAuthenticationError = coreUtils.CVAuthenticationError;
  handleError = coreUtils.handleError;
  createErrorContext = coreUtils.createErrorContext;
} catch (error) {
  // Core error handling not available, will use local implementations
}

/**
 * Creates a standardized authentication error
 * Integrates with Core error handling when available for consistency
  */
export function createAuthError(
  code: AuthErrorCode,
  message: string,
  context?: AuthErrorContext
): AuthError {
  // Try to use Core error handling if available
  if (CVAuthenticationError && handleError && createErrorContext) {
    try {
      const coreContext = createErrorContext(
        'auth',
        context?.operation || 'authentication',
        context?.userId,
        context?.additionalData
      );
      
      const coreError = new CVAuthenticationError(message, coreContext);
      handleError(coreError, coreContext);
    } catch (coreError) {
      // If Core error handling fails, continue with local handling
      logger.warn('Core error handling failed, using local implementation:', coreError);
    }
  }

  const error: AuthError = {
    code,
    message,
    name: 'AuthError',
    timestamp: Date.now(),
    context,
    retryable: isRetryableError(code),
    userMessage: getUserFriendlyMessage(code, message)
  };

  if (isRetryableError(code)) {
    error.retryAfter = getRetryDelay(code);
  }

  return error;
}

/**
 * Creates an authentication error from a Firebase error
  */
export function createFromFirebaseError(firebaseError: any): AuthError {
  const code = firebaseError?.code || 'auth/unknown-error';
  const message = firebaseError?.message || 'Unknown authentication error';
  
  return createAuthError(
    code,
    message,
    {
      operation: 'firebase-auth',
      additionalData: {
        originalError: firebaseError
      }
    }
  );
}

/**
 * Creates a network-related authentication error
  */
export function createNetworkError(originalError: Error): AuthError {
  return createAuthError(
    'network/offline',
    'Network connection error during authentication',
    {
      operation: 'network-request',
      additionalData: {
        originalError: originalError.message
      }
    }
  );
}

/**
 * Creates a validation error for authentication data
  */
export function createValidationError(field: string, value: any): AuthError {
  return createAuthError(
    'auth/invalid-credential',
    `Validation failed for field: ${field}`,
    {
      operation: 'validation',
      additionalData: {
        field,
        value: typeof value === 'string' ? value.substring(0, 10) + '...' : typeof value
      }
    }
  );
}

/**
 * Creates a permission-related error
  */
export function createPermissionError(required: string, actual?: string): AuthError {
  return createAuthError(
    'permission/denied',
    `Insufficient permissions. Required: ${required}${actual ? `, Actual: ${actual}` : ''}`,
    {
      operation: 'permission-check',
      additionalData: {
        required,
        actual
      }
    }
  );
}

/**
 * Creates a premium feature access error
  */
export function createPremiumError(feature: string, tier?: string): AuthError {
  return createAuthError(
    'premium/required',
    `Premium subscription required for feature: ${feature}`,
    {
      operation: 'feature-access',
      additionalData: {
        feature,
        currentTier: tier || 'free'
      }
    }
  );
}

/**
 * Determines if an error is retryable
  */
function isRetryableError(code: AuthErrorCode): boolean {
  const retryableCodes: AuthErrorCode[] = [
    'network/timeout',
    'network/offline',
    'service/unavailable',
    'service/overloaded',
    'token/refresh-failed',
    'session/refresh-failed',
    'auth/network-request-failed',
    'auth/too-many-requests'
  ];

  return retryableCodes.includes(code);
}

/**
 * Gets the retry delay for retryable errors (in milliseconds)
  */
function getRetryDelay(code: AuthErrorCode): number {
  const delays: Record<string, number> = {
    'network/timeout': 1000,
    'network/offline': 5000,
    'service/unavailable': 10000,
    'service/overloaded': 30000,
    'token/refresh-failed': 2000,
    'session/refresh-failed': 3000,
    'auth/network-request-failed': 2000,
    'auth/too-many-requests': 60000
  };

  return delays[code] || 5000;
}

/**
 * Gets a user-friendly error message
  */
function getUserFriendlyMessage(code: AuthErrorCode, fallback: string): string {
  const errorMessage = DEFAULT_ERROR_MESSAGES[code];
  return errorMessage?.message || fallback;
}

/**
 * Checks if an error is an authentication error
  */
export function isAuthError(error: any): error is AuthError {
  return error && typeof error === 'object' && 'code' in error && 'timestamp' in error;
}

/**
 * Extracts relevant error information for logging
  */
export function getErrorInfo(error: AuthError): Record<string, any> {
  return {
    code: error.code,
    message: error.message,
    timestamp: error.timestamp,
    retryable: error.retryable,
    retryAfter: error.retryAfter,
    context: error.context,
    userAgent: error.context?.userAgent,
    operation: error.context?.operation
  };
}

/**
 * Sanitizes error data for safe transmission (removes sensitive information)
  */
export function sanitizeErrorForTransmission(error: AuthError): Partial<AuthError> {
  return {
    code: error.code,
    message: error.userMessage || error.message,
    timestamp: error.timestamp,
    retryable: error.retryable,
    retryAfter: error.retryAfter,
    context: {
      operation: error.context?.operation,
      userAgent: error.context?.userAgent,
      platform: error.context?.platform
      // Exclude sensitive data like IP addresses, user IDs, etc.
    }
  };
}