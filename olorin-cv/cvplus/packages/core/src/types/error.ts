/**
 * Error Handling Types
 * 
 * Standardized error types and structures for the CVPlus platform.
 * Provides consistent error handling across all services.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// ERROR SEVERITY AND CATEGORY TYPES
// ============================================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorCategory = 
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'network'
  | 'database'
  | 'processing'
  | 'external_service'
  | 'system'
  | 'user_input'
  | 'business_logic';

// ============================================================================
// BASE ERROR INTERFACE
// ============================================================================

export interface BaseError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  details?: Record<string, any>;
  stack?: string;
  context?: Record<string, any>;
}

// ============================================================================
// SPECIFIC ERROR TYPES
// ============================================================================

export interface ValidationError extends BaseError {
  category: 'validation';
  field?: string;
  value?: any;
  constraints?: string[];
}

export interface AuthenticationError extends BaseError {
  category: 'authentication';
  authMethod?: string;
  reason?: 'invalid_credentials' | 'token_expired' | 'account_locked' | 'mfa_required';
}

export interface AuthorizationError extends BaseError {
  category: 'authorization';
  resource?: string;
  action?: string;
  requiredPermissions?: string[];
  userPermissions?: string[];
}

export interface NetworkError extends BaseError {
  category: 'network';
  endpoint?: string;
  method?: string;
  statusCode?: number;
  retryCount?: number;
  timeout?: number;
}

export interface DatabaseError extends BaseError {
  category: 'database';
  collection?: string;
  operation?: 'read' | 'write' | 'delete' | 'query';
  documentId?: string;
  query?: any;
}

export interface ProcessingError extends BaseError {
  category: 'processing';
  stage?: string;
  progress?: number;
  inputData?: any;
  processingTime?: number;
}

export interface ExternalServiceError extends BaseError {
  category: 'external_service';
  service: string;
  endpoint?: string;
  statusCode?: number;
  response?: any;
}

// ============================================================================
// ERROR RESULT TYPES
// ============================================================================

export interface ErrorResult {
  success: false;
  error: BaseError;
  data?: null;
}

export interface SuccessResult<T = any> {
  success: true;
  data: T;
  error?: null;
}

export type Result<T = any> = SuccessResult<T> | ErrorResult;

// ============================================================================
// ERROR HANDLING CONTEXT
// ============================================================================

export interface ErrorContext {
  operation: string;
  component?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  timestamp: number;
  environment: 'development' | 'staging' | 'production';
  version?: string;
}

// ============================================================================
// ERROR RECOVERY AND RETRY TYPES
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponential: boolean;
  jitter: boolean;
  retryableErrors?: ErrorCategory[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: BaseError;
  attempts: number;
  totalTime: number;
}

// ============================================================================
// ERROR REPORTING TYPES
// ============================================================================

export interface ErrorReport {
  error: BaseError;
  context: ErrorContext;
  userActions?: string[];
  systemState?: Record<string, any>;
  logs?: string[];
  screenshots?: string[];
  reported: boolean;
  reportedAt?: number;
}

export interface ErrorMetrics {
  errorCode: string;
  count: number;
  lastOccurred: number;
  firstOccurred: number;
  affectedUsers: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// ============================================================================
// ERROR HANDLER TYPES
// ============================================================================

export type ErrorHandler<T = any> = (error: BaseError, context: ErrorContext) => Promise<T | void>;

export interface ErrorHandlerConfig {
  capture: boolean;
  report: boolean;
  retry: RetryConfig | false;
  fallback?: any;
  notify?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// UTILITY FUNCTIONS FOR ERROR CREATION
// ============================================================================

export interface CreateErrorOptions {
  category: ErrorCategory;
  severity?: ErrorSeverity;
  details?: Record<string, any>;
  context?: Record<string, any>;
  correlationId?: string;
  userId?: string;
  requestId?: string;
}

// ============================================================================
// ERROR DETAILS TYPE (for multimedia compatibility)
// ============================================================================

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  timestamp: number;
}

// ============================================================================
// RETRY AND RESILIENCE TYPES
// ============================================================================

export enum RecommendationErrorType {
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AI_API_ERROR = 'AI_API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

export interface RecommendationError extends Error {
  type: RecommendationErrorType;
  retryable: boolean;
  context: Record<string, unknown>;
  timestamp: Date;
}

export interface RetryConfiguration {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: RecommendationErrorType[];
  circuitBreaker?: {
    threshold: number;
    timeout: number;
    resetTimeout: number;
  };
}

export interface PerformanceMetrics {
  errorRate: number;
  timeoutRate: number;
  averageResponseTime?: number;
  cacheHitRate?: number;
  throughput?: number;
  timestamp: Date;
}

// ============================================================================
// ERROR STATUS AND MONITORING
// ============================================================================

export interface SystemHealthError {
  service: string;
  error: BaseError;
  impact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  affectedFeatures?: string[];
  estimatedResolution?: number;
  workaround?: string;
}