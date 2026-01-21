import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
  statusCode: number;
}

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

/**
 * Create operational error (expected errors)
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code || `ERROR_${statusCode}`;
  error.details = details;
  error.isOperational = true;
  return error;
}

/**
 * Handle errors and send appropriate response
 */
export function handleError(
  error: Error | ApiError,
  req: Request,
  res: Response,
  requestId?: string
): void {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    requestId
  });

  const apiError = error as ApiError;
  const statusCode = apiError.statusCode || 500;
  const errorCode = apiError.code || 'INTERNAL_SERVER_ERROR';

  // Determine error message based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  let errorMessage = error.message;

  // Don't expose internal error details in production
  if (!isProduction || apiError.isOperational) {
    errorMessage = error.message;
  } else {
    errorMessage = 'An internal server error occurred';
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      details: apiError.isOperational ? apiError.details : undefined,
      timestamp: new Date().toISOString(),
      requestId
    },
    statusCode
  };

  // Log error to Firestore for monitoring (async, don't await)
  logErrorToFirestore(error, req, requestId).catch(logError => {
    console.error('Failed to log error to Firestore:', logError);
  });

  // Set appropriate headers
  res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });

  res.status(statusCode).json(errorResponse);
}

/**
 * Async error handler wrapper for Firebase Functions
 */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
) {
  return async (req: Request, res: Response): Promise<void> => {
    const requestId = generateRequestId();

    try {
      await fn(req, res);
    } catch (error) {
      handleError(error as Error, req, res, requestId);
    }
  };
}

/**
 * Validation error helper
 */
export function createValidationError(
  message: string,
  field?: string,
  value?: any
): ApiError {
  return createError(
    message,
    400,
    'VALIDATION_ERROR',
    { field, value }
  );
}

/**
 * Authentication error helper
 */
export function createAuthError(message: string = 'Authentication required'): ApiError {
  return createError(message, 401, 'AUTH_ERROR');
}

/**
 * Authorization error helper
 */
export function createAuthorizationError(
  message: string = 'Insufficient permissions'
): ApiError {
  return createError(message, 403, 'AUTHORIZATION_ERROR');
}

/**
 * Not found error helper
 */
export function createNotFoundError(resource?: string): ApiError {
  const message = resource ? `${resource} not found` : 'Resource not found';
  return createError(message, 404, 'NOT_FOUND');
}

/**
 * Rate limit error helper
 */
export function createRateLimitError(
  retryAfter?: number,
  message: string = 'Too many requests'
): ApiError {
  return createError(
    message,
    429,
    'RATE_LIMIT_EXCEEDED',
    { retryAfter }
  );
}

/**
 * Payment required error helper
 */
export function createPaymentRequiredError(
  message: string = 'Payment required',
  requiredCredits?: number
): ApiError {
  return createError(
    message,
    402,
    'PAYMENT_REQUIRED',
    { requiredCredits }
  );
}

/**
 * Service unavailable error helper
 */
export function createServiceUnavailableError(
  service?: string,
  retryAfter?: number
): ApiError {
  const message = service
    ? `${service} service is temporarily unavailable`
    : 'Service temporarily unavailable';

  return createError(
    message,
    503,
    'SERVICE_UNAVAILABLE',
    { service, retryAfter }
  );
}

/**
 * Handle Firebase errors specifically
 */
export function handleFirebaseError(error: any): ApiError {
  console.error('Firebase error:', error);

  // Firebase Auth errors
  if (error.code?.startsWith('auth/')) {
    switch (error.code) {
      case 'auth/user-not-found':
        return createNotFoundError('User');
      case 'auth/invalid-email':
        return createValidationError('Invalid email format');
      case 'auth/user-disabled':
        return createAuthError('User account is disabled');
      case 'auth/id-token-expired':
        return createAuthError('Authentication token has expired');
      case 'auth/id-token-revoked':
        return createAuthError('Authentication token has been revoked');
      case 'auth/invalid-id-token':
        return createAuthError('Invalid authentication token');
      default:
        return createAuthError('Authentication failed');
    }
  }

  // Firestore errors
  if (error.code?.startsWith('firestore/')) {
    switch (error.code) {
      case 'firestore/permission-denied':
        return createAuthorizationError('Access denied to Firestore resource');
      case 'firestore/not-found':
        return createNotFoundError('Document');
      case 'firestore/already-exists':
        return createError('Document already exists', 409, 'DOCUMENT_EXISTS');
      case 'firestore/resource-exhausted':
        return createRateLimitError(60, 'Firestore quota exceeded');
      case 'firestore/unavailable':
        return createServiceUnavailableError('Firestore', 30);
      default:
        return createError('Database operation failed', 500, 'DATABASE_ERROR');
    }
  }

  // Storage errors
  if (error.code?.startsWith('storage/')) {
    switch (error.code) {
      case 'storage/object-not-found':
        return createNotFoundError('File');
      case 'storage/unauthorized':
        return createAuthorizationError('Access denied to storage resource');
      case 'storage/quota-exceeded':
        return createError('Storage quota exceeded', 413, 'STORAGE_QUOTA_EXCEEDED');
      case 'storage/invalid-url':
        return createValidationError('Invalid storage URL');
      default:
        return createError('Storage operation failed', 500, 'STORAGE_ERROR');
    }
  }

  // Default Firebase error
  return createError(
    'Firebase operation failed',
    500,
    'FIREBASE_ERROR',
    { originalCode: error.code }
  );
}

/**
 * Handle external API errors
 */
export function handleExternalApiError(
  error: any,
  service: string
): ApiError {
  console.error(`${service} API error:`, error);

  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // Map common HTTP status codes
    switch (status) {
      case 400:
        return createValidationError(
          `${service} API validation error: ${data?.message || 'Bad request'}`
        );
      case 401:
        return createError(
          `${service} API authentication failed`,
          500,
          'EXTERNAL_AUTH_ERROR'
        );
      case 403:
        return createError(
          `${service} API access denied`,
          500,
          'EXTERNAL_ACCESS_DENIED'
        );
      case 404:
        return createNotFoundError(`${service} resource`);
      case 429:
        return createRateLimitError(
          error.response.headers['retry-after'],
          `${service} API rate limit exceeded`
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return createServiceUnavailableError(service);
      default:
        return createError(
          `${service} API error: ${data?.message || 'Unknown error'}`,
          500,
          'EXTERNAL_API_ERROR'
        );
    }
  }

  // Network or timeout errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return createServiceUnavailableError(service);
  }

  if (error.code === 'ETIMEDOUT') {
    return createError(
      `${service} API timeout`,
      504,
      'EXTERNAL_API_TIMEOUT'
    );
  }

  // Default external API error
  return createError(
    `${service} service error`,
    500,
    'EXTERNAL_SERVICE_ERROR',
    { originalError: error.message }
  );
}

/**
 * Log error to Firestore for monitoring
 */
async function logErrorToFirestore(
  error: Error | ApiError,
  req: Request,
  requestId?: string
): Promise<void> {
  try {
    const firestore = admin.firestore();

    const errorLog = {
      message: error.message,
      stack: error.stack,
      statusCode: (error as ApiError).statusCode || 500,
      code: (error as ApiError).code || 'UNKNOWN_ERROR',
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      timestamp: admin.firestore.Timestamp.now(),
      requestId,
      environment: process.env.NODE_ENV || 'production'
    };

    await firestore.collection('error_logs').add(errorLog);

    // Also increment error counter for monitoring
    const today = new Date().toISOString().split('T')[0];
    const errorCounterRef = firestore
      .collection('system_metrics')
      .doc('error_counts')
      .collection('daily')
      .doc(today);

    await errorCounterRef.set(
      {
        [`${(error as ApiError).code || 'UNKNOWN_ERROR'}`]: admin.firestore.FieldValue.increment(1),
        total: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.Timestamp.now()
      },
      { merge: true }
    );

  } catch (logError) {
    console.error('Failed to log error to Firestore:', logError);
    // Don't throw here - we don't want logging errors to crash the app
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handle unhandled promise rejections
 */
export function setupGlobalErrorHandling(): void {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);

    // Log to Firestore (don't await)
    admin.firestore().collection('system_errors').add({
      type: 'unhandled_rejection',
      reason: reason instanceof Error ? {
        message: reason.message,
        stack: reason.stack
      } : String(reason),
      timestamp: admin.firestore.Timestamp.now(),
      environment: process.env.NODE_ENV || 'production'
    }).catch(error => {
      console.error('Failed to log unhandled rejection:', error);
    });

    // Don't exit the process in production
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);

    // Log to Firestore (don't await)
    admin.firestore().collection('system_errors').add({
      type: 'uncaught_exception',
      message: error.message,
      stack: error.stack,
      timestamp: admin.firestore.Timestamp.now(),
      environment: process.env.NODE_ENV || 'production'
    }).catch(logError => {
      console.error('Failed to log uncaught exception:', logError);
    });

    // Exit gracefully
    process.exit(1);
  });
}

/**
 * Error recovery utilities
 */
export class ErrorRecovery {
  /**
   * Retry operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        console.warn(`Operation failed, retrying (${attempt}/${maxRetries}):`, error);
      }
    }

    throw lastError!;
  }

  /**
   * Circuit breaker pattern
   */
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringPeriod: number;
    }
  ) {
    let failureCount = 0;
    let lastFailureTime: number | null = null;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return async (): Promise<T> => {
      const now = Date.now();

      // Reset failure count if monitoring period has passed
      if (lastFailureTime && now - lastFailureTime > options.monitoringPeriod) {
        failureCount = 0;
        state = 'closed';
      }

      // If circuit is open, check if recovery timeout has passed
      if (state === 'open') {
        if (!lastFailureTime || now - lastFailureTime < options.recoveryTimeout) {
          throw createServiceUnavailableError('Circuit breaker is open');
        }
        state = 'half-open';
      }

      try {
        const result = await operation();

        // Success - reset circuit breaker
        if (state === 'half-open') {
          state = 'closed';
          failureCount = 0;
        }

        return result;

      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        // Open circuit if failure threshold reached
        if (failureCount >= options.failureThreshold) {
          state = 'open';
        }

        throw error;
      }
    };
  }
}