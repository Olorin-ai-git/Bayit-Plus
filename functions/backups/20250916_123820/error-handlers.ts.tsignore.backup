// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Error Handler Utilities
 * 
 * Centralized error handling utilities for Firebase Functions.
 * Minimal implementation for TypeScript compilation.
 */

import { HttpsError } from 'firebase-functions/v2/https';

export interface ErrorContext {
  functionName: string;
  userId?: string;
  requestId?: string;
  timestamp: number;
  additionalData?: Record<string, any>;
}

export function handleFunctionError(
  error: any,
  context: ErrorContext,
  defaultMessage: string = 'Internal server error'
): HttpsError {
  console.error(`Function error in ${context.functionName}:`, {
    error,
    context,
    stack: error?.stack
  });
  
  // Sanitize error for client
  const clientMessage = error?.message || defaultMessage;
  
  return new HttpsError('internal', clientMessage, {
    context: sanitizeErrorContext(context)
  });
}

export function sanitizeErrorContext(context: ErrorContext): Partial<ErrorContext> {
  return {
    functionName: context.functionName,
    requestId: context.requestId,
    timestamp: context.timestamp
    // Exclude sensitive data like userId from client responses
  };
}

export function createErrorContext(
  functionName: string,
  options: Partial<ErrorContext> = {}
): ErrorContext {
  return {
    functionName,
    timestamp: Date.now(),
    ...options
  };
}

export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'ProcessingError';
  }
}

export class ValidationError extends ProcessingError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ProcessingError {
  constructor(message: string, context?: any) {
    super(message, 'AUTHENTICATION_ERROR', context);
    this.name = 'AuthenticationError';
  }
}