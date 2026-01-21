/**
 * Firebase Functions Response Formatter Utilities
 * 
 * Standardized response formatting patterns for Firebase Functions.
 * Consolidates response formatting patterns found across 10+ function files.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

/**
 * Standard success response format
  */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Standard error response format
  */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

/**
 * Response metadata for additional context
  */
export interface ResponseMetadata {
  /** Request processing duration in milliseconds  */
  duration?: number;
  /** Function version or build identifier  */
  version?: string;
  /** Request ID for tracing  */
  requestId?: string;
  /** Additional metadata fields  */
  [key: string]: any;
}

/**
 * Creates a standardized success response
 * Consolidates the pattern: { success: true, data: result, timestamp: ... }
 * 
 * @param data - Response data
 * @param metadata - Optional metadata
 * @returns Standardized success response
  */
export function createSuccessResponse<T>(
  data: T,
  metadata?: ResponseMetadata
): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(metadata && { metadata })
  };
}

/**
 * Creates a standardized error response
 * Consolidates error response patterns across functions
 * 
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional error details
 * @returns Standardized error response
  */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, any>
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Wraps data with success response format
 * Quick helper for simple success responses
 * 
 * @param data - Data to wrap
 * @returns Success response with data
  */
export function wrapSuccess<T>(data: T): SuccessResponse<T> {
  return createSuccessResponse(data);
}

/**
 * Wraps error with error response format
 * Quick helper for simple error responses
 * 
 * @param message - Error message
 * @param code - Error code (defaults to 'internal')
 * @returns Error response
  */
export function wrapError(
  message: string,
  code: string = 'internal'
): ErrorResponse {
  return createErrorResponse(code, message);
}

/**
 * Creates a paginated response format
 * Common pattern for list endpoints with pagination
 * 
 * @param items - Array of items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @param metadata - Optional additional metadata
  */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
  metadata?: ResponseMetadata
): SuccessResponse<{
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}> {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return createSuccessResponse(
    {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      }
    },
    metadata
  );
}

/**
 * Creates a response with performance metrics
 * Useful for tracking function execution time
 * 
 * @param data - Response data
 * @param startTime - Function start time (from performance.now() or Date.now())
 * @param additionalMetadata - Additional metadata
  */
export function createTimedResponse<T>(
  data: T,
  startTime: number,
  additionalMetadata?: Record<string, any>
): SuccessResponse<T> {
  const duration = Date.now() - startTime;
  
  return createSuccessResponse(data, {
    duration,
    ...additionalMetadata
  });
}

/**
 * Creates a response indicating async operation started
 * Common pattern for long-running operations
 * 
 * @param operationId - Unique operation identifier
 * @param estimatedDuration - Estimated completion time in milliseconds
 * @param statusCheckUrl - Optional URL for status checking
  */
export function createAsyncResponse(
  operationId: string,
  estimatedDuration?: number,
  statusCheckUrl?: string
): SuccessResponse<{
  operationId: string;
  status: 'started';
  estimatedDuration?: number;
  statusCheckUrl?: string;
}> {
  return createSuccessResponse({
    operationId,
    status: 'started' as const,
    ...(estimatedDuration && { estimatedDuration }),
    ...(statusCheckUrl && { statusCheckUrl })
  });
}

/**
 * Creates a response for feature access check results
 * Common pattern for premium feature validation
 * 
 * @param hasAccess - Whether user has access
 * @param feature - Feature being checked
 * @param subscriptionStatus - User's subscription status
 * @param additionalInfo - Additional access information
  */
export function createFeatureAccessResponse(
  hasAccess: boolean,
  feature: string,
  subscriptionStatus: string,
  additionalInfo?: Record<string, any>
): SuccessResponse<{
  hasAccess: boolean;
  feature: string;
  subscriptionStatus: string;
  message: string;
} & Record<string, any>> {
  return createSuccessResponse({
    hasAccess,
    feature,
    subscriptionStatus,
    message: hasAccess 
      ? `Access granted for feature '${feature}'`
      : `Access denied for feature '${feature}'`,
    ...additionalInfo
  });
}

/**
 * Creates a validation response
 * Common pattern for validation endpoints
 * 
 * @param isValid - Whether validation passed
 * @param errors - Array of validation errors
 * @param validatedData - The validated data (if successful)
  */
export function createValidationResponse<T = any>(
  isValid: boolean,
  errors: string[] = [],
  validatedData?: T
): SuccessResponse<{
  isValid: boolean;
  errors: string[];
  data?: T;
}> {
  return createSuccessResponse({
    isValid,
    errors,
    ...(validatedData && { data: validatedData })
  });
}

/**
 * Creates a health check response
 * Common pattern for system health monitoring
 * 
 * @param status - Health status ('healthy' | 'unhealthy' | 'degraded')
 * @param checks - Individual check results
 * @param uptime - System uptime in milliseconds
  */
export function createHealthResponse(
  status: 'healthy' | 'unhealthy' | 'degraded',
  checks: Record<string, { status: string; message?: string; duration?: number }>,
  uptime?: number
): SuccessResponse<{
  status: string;
  checks: Record<string, any>;
  timestamp: string;
  uptime?: number;
}> {
  return createSuccessResponse({
    status,
    checks,
    timestamp: new Date().toISOString(),
    ...(uptime && { uptime })
  });
}

/**
 * Utility function to measure and format response time
 * Use with createTimedResponse for performance tracking
 * 
 * @returns Object with startTime and getElapsed function
  */
export function createTimer() {
  const startTime = Date.now();
  
  return {
    startTime,
    getElapsed: () => Date.now() - startTime,
    createResponse: <T>(data: T, metadata?: Record<string, any>) =>
      createTimedResponse(data, startTime, metadata)
  };
}

/**
 * Formats file upload response
 * Common pattern for file processing endpoints
 * 
 * @param fileId - Unique file identifier
 * @param fileName - Original file name
 * @param fileSize - File size in bytes
 * @param processingStatus - Current processing status
 * @param downloadUrl - Optional download URL
  */
export function createFileResponse(
  fileId: string,
  fileName: string,
  fileSize: number,
  processingStatus: 'uploaded' | 'processing' | 'completed' | 'failed',
  downloadUrl?: string
): SuccessResponse<{
  fileId: string;
  fileName: string;
  fileSize: number;
  processingStatus: string;
  downloadUrl?: string;
}> {
  return createSuccessResponse({
    fileId,
    fileName,
    fileSize,
    processingStatus,
    ...(downloadUrl && { downloadUrl })
  });
}