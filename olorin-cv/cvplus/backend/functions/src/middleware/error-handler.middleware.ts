/**
 * Error Handling Middleware
 * Centralized error handling with secure error responses
 */

import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config/schema';

/**
 * Application error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Bad request error
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Error handler middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const config = getConfig();
  const isDevelopment = config.app.env === 'development';

  // Log error
  console.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Determine status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Determine error code
  const code = err instanceof AppError && err.code ? err.code : 'INTERNAL_SERVER_ERROR';

  // Build error response
  const errorResponse: any = {
    error: err.name,
    message: err.message,
    code,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Add details in development mode or for client errors
  if (isDevelopment || statusCode < 500) {
    if (err instanceof AppError && err.details) {
      errorResponse.details = err.details;
    }
  }

  // Add stack trace in development mode
  if (isDevelopment) {
    errorResponse.stack = err.stack;
  }

  // Sanitize error message for production
  if (!isDevelopment && statusCode >= 500) {
    errorResponse.message = 'An internal server error occurred';
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}

/**
 * Validation error formatter
 */
export function formatValidationError(errors: any[]): AppError {
  return new BadRequestError('Validation failed', errors);
}

/**
 * Unhandled rejection handler
 */
export function handleUnhandledRejection(): void {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Log to monitoring service (e.g., Sentry)
  });
}

/**
 * Uncaught exception handler
 */
export function handleUncaughtException(): void {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    // Log to monitoring service (e.g., Sentry)
    // Graceful shutdown
    process.exit(1);
  });
}

/**
 * Initialize error handlers
 */
export function initializeErrorHandlers(): void {
  handleUnhandledRejection();
  handleUncaughtException();
}
