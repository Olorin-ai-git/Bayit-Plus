/**
 * @olorin/shared-services
 *
 * Cross-platform service utilities for the Olorin.ai ecosystem.
 * Provides API client factories, service patterns, and utilities.
 */

// API Client
export {
  createApiClient,
  createDataApiClient,
  generateUUID,
  extractApiError,
  isApiError,
  SECURITY_HEADERS,
  CORRELATION_ID_HEADER,
  type ApiClientConfig,
  type ApiError,
} from './createApiClient';

// Service factory
export {
  createService,
  type ServiceConfig,
  type ServiceResponse,
  type ServiceErrorResponse,
  type ServiceResult,
  type PaginationParams,
  type PaginatedResponse,
  type BaseService,
} from './createService';

// Retry utilities
export {
  withRetry,
  retry,
  createRetry,
  defaultIsRetryable,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
} from './retry';
