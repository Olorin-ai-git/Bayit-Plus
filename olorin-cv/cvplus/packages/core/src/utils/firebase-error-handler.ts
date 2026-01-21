/**
 * Firebase Functions Error Handler Utilities
 * 
 * Standardized error handling patterns for Firebase Functions.
 * Consolidates error handling patterns found across 15+ function files.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { logger } from 'firebase-functions';

// Common error types for Firebase Functions
export type FirebaseErrorCode = 
  | 'cancelled'
  | 'unknown'
  | 'invalid-argument'
  | 'deadline-exceeded'
  | 'not-found'
  | 'already-exists'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'unimplemented'
  | 'internal'
  | 'unavailable'
  | 'data-loss'
  | 'unauthenticated';

/**
 * Firebase Functions Error Details
  */
export interface FirebaseErrorDetails {
  /** Error code for categorization  */
  code: FirebaseErrorCode;
  /** Human-readable error message  */
  message: string;
  /** Additional error context  */
  details?: Record<string, any>;
}

/**
 * Firebase Error Handler Context for logging
  */
export interface FirebaseErrorContext {
  /** Function name where error occurred  */
  functionName?: string;
  /** User ID if available  */
  userId?: string;
  /** Request data for debugging  */
  requestData?: Record<string, any>;
  /** Additional context properties  */
  [key: string]: any;
}

/**
 * Creates a Firebase HttpsError with standardized logging
 * Consolidates the pattern: logger.error() -> throw new HttpsError()
 * 
 * @param errorDetails - Error code, message and details
 * @param context - Additional context for logging
 * @param originalError - Original error for debugging
 * @returns Never returns, always throws
  */
export function throwFirebaseError(
  errorDetails: FirebaseErrorDetails,
  context: FirebaseErrorContext = {},
  originalError?: Error
): never {
  // Log error with context for debugging
  logger.error(`Firebase Function Error: ${errorDetails.message}`, {
    errorCode: errorDetails.code,
    context,
    originalError: originalError?.message,
    stack: originalError?.stack,
    timestamp: new Date().toISOString()
  });

  // Lazy import to avoid circular dependencies
  const { HttpsError } = require('firebase-functions/v2/https');
  
  // Throw standardized HttpsError
  throw new HttpsError(
    errorDetails.code,
    errorDetails.message,
    {
      ...errorDetails.details,
      context,
      originalError: originalError?.message
    }
  );
}

/**
 * Handles common error patterns with automatic error type detection
 * Consolidates the pattern: catch (error) -> if instanceof -> throw
 * 
 * @param error - Caught error object
 * @param context - Error context for logging
 * @param fallbackMessage - Fallback message if error is unknown
  */
export function handleFirebaseError(
  error: any,
  context: FirebaseErrorContext = {},
  fallbackMessage = 'Internal server error'
): never {
  // Import HttpsError type for instanceof check
  let HttpsError: any;
  try {
    HttpsError = require('firebase-functions/v2/https').HttpsError;
  } catch (importError) {
    // Fallback if import fails
    logger.error('Failed to import HttpsError', { importError });
  }

  // If already a Firebase HttpsError, re-throw with additional context
  if (HttpsError && error instanceof HttpsError) {
    logger.error('Rethrowing Firebase HttpsError', {
      originalCode: error.code,
      originalMessage: error.message,
      context,
      timestamp: new Date().toISOString()
    });
    throw error;
  }

  // Handle common error patterns
  if (error?.code === 'permission-denied') {
    throwFirebaseError(
      {
        code: 'permission-denied',
        message: 'Access denied to requested resource',
        details: { originalError: error.message }
      },
      context,
      error
    );
  }

  if (error?.code === 'not-found') {
    throwFirebaseError(
      {
        code: 'not-found',
        message: 'Requested resource not found',
        details: { originalError: error.message }
      },
      context,
      error
    );
  }

  if (error?.code === 'unauthenticated') {
    throwFirebaseError(
      {
        code: 'unauthenticated',
        message: 'User must be authenticated',
        details: { originalError: error.message }
      },
      context,
      error
    );
  }

  // Default to internal error for unknown errors
  throwFirebaseError(
    {
      code: 'internal',
      message: fallbackMessage,
      details: { 
        originalError: error?.message,
        errorType: typeof error,
        errorName: error?.constructor?.name
      }
    },
    context,
    error
  );
}

/**
 * Wraps async operations with standardized error handling
 * Consolidates the pattern: try { ... } catch (error) { handleError }
 * 
 * @param operation - Async operation to wrap
 * @param context - Error context for debugging
 * @param fallbackMessage - Custom fallback error message
 * @returns Promise result or throws standardized error
  */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: FirebaseErrorContext = {},
  fallbackMessage = 'Operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleFirebaseError(error, context, fallbackMessage);
  }
}

/**
 * Validates authentication context and throws standardized error if missing
 * Consolidates the pattern: if (!context.auth) { throw new HttpsError }
 * 
 * @param auth - Firebase auth context
 * @param context - Additional context for error logging
  */
export function requireAuthentication(
  auth: any,
  context: FirebaseErrorContext = {}
): asserts auth is NonNullable<typeof auth> {
  if (!auth) {
    throwFirebaseError(
      {
        code: 'unauthenticated',
        message: 'User must be authenticated',
        details: { 
          hasAuth: false,
          authType: typeof auth
        }
      },
      {
        ...context,
        functionName: context.functionName || 'unknown',
        authenticationCheck: 'failed'
      }
    );
  }

  if (!auth.uid) {
    throwFirebaseError(
      {
        code: 'unauthenticated',
        message: 'Invalid authentication token',
        details: { 
          hasAuth: true,
          hasUid: false,
          authKeys: Object.keys(auth)
        }
      },
      {
        ...context,
        functionName: context.functionName || 'unknown',
        authenticationCheck: 'invalid_token'
      }
    );
  }
}

/**
 * Validates user ID matches authenticated user
 * Consolidates the pattern: if (auth.uid !== data.userId) { throw }
 * 
 * @param authUid - Authenticated user ID
 * @param requestedUserId - User ID from request data
 * @param context - Additional context for error logging
  */
export function validateUserAccess(
  authUid: string,
  requestedUserId: string,
  context: FirebaseErrorContext = {}
): void {
  if (authUid !== requestedUserId) {
    throwFirebaseError(
      {
        code: 'permission-denied',
        message: 'User ID mismatch - access denied',
        details: {
          authUid: authUid.substring(0, 8) + '***', // Partial UID for logging
          requestedUserId: requestedUserId.substring(0, 8) + '***'
        }
      },
      {
        ...context,
        functionName: context.functionName || 'unknown',
        accessValidation: 'user_id_mismatch'
      }
    );
  }
}

/**
 * Creates a safe error object for client responses
 * Removes sensitive information while preserving useful error details
 * 
 * @param error - Original error object
 * @returns Sanitized error object safe for client consumption
  */
export function createSafeErrorResponse(error: any): Record<string, any> {
  return {
    success: false,
    error: {
      code: error?.code || 'internal',
      message: error?.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  };
}