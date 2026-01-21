/**
 * Integration Adapters
 *
 * Constitutional Compliance:
 * - Type-safe data adapters
 * - Configuration-driven transformations
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { adaptBackendResponse, adaptFrontendRequest } from '@api/integration/adapters';
 */

import type { ApiResult } from '../types';

/**
 * Backend response adapter
 */
export interface BackendResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  metadata?: Record<string, unknown>;
}

export function adaptBackendResponse<T>(
  response: BackendResponse<T>
): ApiResult<T> {
  if (response.success && response.data !== undefined) {
    return {
      success: true,
      data: response.data
    };
  }

  return {
    success: false,
    error: {
      message: response.error?.message || 'Unknown error occurred',
      code: response.error?.code || 'UNKNOWN_ERROR',
      status: 500
    }
  };
}

/**
 * Frontend request adapter
 */
export interface FrontendRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface BackendRequest {
  url: string;
  method: string;
  body?: string;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export function adaptFrontendRequest(request: FrontendRequest): BackendRequest {
  return {
    url: request.endpoint,
    method: request.method,
    body: request.data ? JSON.stringify(request.data) : undefined,
    params: request.params,
    headers: {
      'Content-Type': 'application/json',
      ...request.headers
    }
  };
}

/**
 * Paginated response adapter
 */
export interface PaginatedBackendResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PaginatedFrontendResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function adaptPaginatedResponse<T>(
  response: PaginatedBackendResponse<T>
): PaginatedFrontendResponse<T> {
  const totalPages = Math.ceil(response.total / response.page_size);

  return {
    items: response.items,
    total: response.total,
    page: response.page,
    pageSize: response.page_size,
    totalPages,
    hasNext: response.page < totalPages,
    hasPrevious: response.page > 1
  };
}

/**
 * Investigation response adapter
 */
export interface BackendInvestigation {
  investigation_id: string;
  entity_id: string;
  entity_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  results?: Record<string, unknown>;
  error?: string;
}

export interface FrontendInvestigation {
  investigationId: string;
  entityId: string;
  entityType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  results?: Record<string, unknown>;
  error?: string;
}

export function adaptInvestigationResponse(
  investigation: BackendInvestigation
): FrontendInvestigation {
  return {
    investigationId: investigation.investigation_id,
    entityId: investigation.entity_id,
    entityType: investigation.entity_type,
    status: investigation.status,
    createdAt: new Date(investigation.created_at),
    updatedAt: new Date(investigation.updated_at),
    results: investigation.results,
    error: investigation.error
  };
}

/**
 * Investigation request adapter
 */
export interface FrontendInvestigationRequest {
  entityId: string;
  entityType: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  options?: Record<string, unknown>;
}

export interface BackendInvestigationRequest {
  entity_id: string;
  entity_type: string;
  time_range?: {
    start: string;
    end: string;
  };
  options?: Record<string, unknown>;
}

export function adaptInvestigationRequest(
  request: FrontendInvestigationRequest
): BackendInvestigationRequest {
  return {
    entity_id: request.entityId,
    entity_type: request.entityType,
    time_range: request.timeRange
      ? {
          start: request.timeRange.start.toISOString(),
          end: request.timeRange.end.toISOString()
        }
      : undefined,
    options: request.options
  };
}

/**
 * Error adapter
 */
export interface BackendError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export interface FrontendError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export function adaptError(error: BackendError): FrontendError {
  return {
    message: error.message,
    code: error.code,
    status: error.status,
    details: error.details
  };
}

/**
 * Batch response adapter
 */
export interface BatchBackendResponse<T> {
  results: Array<{
    success: boolean;
    data?: T;
    error?: BackendError;
  }>;
  total: number;
  successful: number;
  failed: number;
}

export interface BatchFrontendResponse<T> {
  results: ApiResult<T>[];
  total: number;
  successful: number;
  failed: number;
}

export function adaptBatchResponse<T>(
  response: BatchBackendResponse<T>
): BatchFrontendResponse<T> {
  return {
    results: response.results.map((result) => {
      if (result.success && result.data !== undefined) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: {
          message: result.error?.message || 'Unknown error',
          code: result.error?.code || 'UNKNOWN_ERROR',
          status: result.error?.status || 500
        }
      };
    }),
    total: response.total,
    successful: response.successful,
    failed: response.failed
  };
}
