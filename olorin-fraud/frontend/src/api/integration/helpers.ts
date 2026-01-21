/**
 * Integration Helpers
 *
 * Constitutional Compliance:
 * - Type-safe integration utilities
 * - Configuration-driven endpoints
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { buildUrl, parseResponseHeaders, handleApiResponse } from '@api/integration/helpers';
 */

import { getApiConfig } from '../config';
import type { ApiResult, ApiError } from '../types';

/**
 * Build full API URL from endpoint
 */
export function buildUrl(endpoint: string, params?: Record<string, unknown>): string {
  const config = getApiConfig();
  const url = new URL(endpoint, config.apiBaseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Parse response headers into record
 */
export function parseResponseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

/**
 * Extract pagination info from headers
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function extractPaginationInfo(headers: Headers): PaginationInfo | null {
  const page = headers.get('x-page');
  const pageSize = headers.get('x-page-size');
  const totalItems = headers.get('x-total-items');
  const totalPages = headers.get('x-total-pages');

  if (!page || !pageSize || !totalItems || !totalPages) {
    return null;
  }

  return {
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10),
    totalItems: parseInt(totalItems, 10),
    totalPages: parseInt(totalPages, 10)
  };
}

/**
 * Extract rate limit info from headers
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

export function extractRateLimitInfo(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: new Date(parseInt(reset, 10) * 1000)
  };
}

/**
 * Handle API response
 */
export function handleApiResponse<T>(
  data: T,
  status: number,
  headers?: Headers
): ApiResult<T> {
  if (status >= 200 && status < 300) {
    return {
      success: true,
      data,
      status,
      headers: headers ? parseResponseHeaders(headers) : undefined
    };
  }

  return {
    success: false,
    error: {
      message: `Request failed with status ${status}`,
      status,
      code: `HTTP_${status}`
    }
  };
}

/**
 * Handle API error
 */
export function handleApiError(error: Error, status?: number): ApiResult<never> {
  const apiError: ApiError = {
    message: error.message,
    status: status || 500,
    code: error.name || 'UNKNOWN_ERROR'
  };

  return {
    success: false,
    error: apiError
  };
}

/**
 * Create form data from object
 */
export function createFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((item) => {
          formData.append(`${key}[]`, String(item));
        });
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });

  return formData;
}

/**
 * Parse form data to object
 */
export function parseFormData(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  formData.forEach((value, key) => {
    if (key.endsWith('[]')) {
      const arrayKey = key.slice(0, -2);
      if (!result[arrayKey]) {
        result[arrayKey] = [];
      }
      (result[arrayKey] as unknown[]).push(value);
    } else {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Serialize query parameters
 */
export function serializeQueryParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          searchParams.append(key, String(item));
        });
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
}

/**
 * Parse query parameters
 */
export function parseQueryParams(queryString: string): Record<string, unknown> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, unknown> = {};

  params.forEach((value, key) => {
    if (result[key]) {
      if (Array.isArray(result[key])) {
        (result[key] as unknown[]).push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Check if response is JSON
 */
export function isJsonResponse(headers: Headers): boolean {
  const contentType = headers.get('content-type');
  return contentType?.includes('application/json') ?? false;
}

/**
 * Check if response is successful
 */
export function isSuccessfulResponse(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Get error message from response
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return 'An unknown error occurred';
}
