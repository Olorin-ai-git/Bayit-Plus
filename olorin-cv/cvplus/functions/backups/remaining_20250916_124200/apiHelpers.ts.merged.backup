// @ts-ignore - Export conflicts/**
 * API helper functions for the CVPlus Workflow module
 */

import { API_CONFIG, HTTP_STATUS } from '../constants';

/**
 * API Response interface
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

/**
 * API Request options
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

/**
 * Build full API URL
 */
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}${endpoint}`;
  
  // Replace path parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    });
  }
  
  return url;
};

/**
 * Add query parameters to URL
 */
export const addQueryParams = (url: string, params: Record<string, any>): string => {
  const urlObj = new URL(url);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => urlObj.searchParams.append(key, v.toString()));
      } else {
        urlObj.searchParams.set(key, value.toString());
      }
    }
  });
  
  return urlObj.toString();
};

/**
 * Make API request with retry logic
 */
export const makeApiRequest = async <T = any>(
  endpoint: string,
  options: ApiRequestOptions = {},
  pathParams?: Record<string, string>,
  queryParams?: Record<string, any>
): Promise<ApiResponse<T>> => {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = API_CONFIG.TIMEOUT,
    retries = API_CONFIG.RETRY_ATTEMPTS
  } = options;

  let url = buildApiUrl(endpoint, pathParams);
  
  if (queryParams) {
    url = addQueryParams(url, queryParams);
  }

  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    signal: AbortSignal.timeout(timeout)
  };

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, requestOptions);
      
      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (response.ok) {
        return {
          data,
          status: response.status,
          success: true
        };
      } else {
        return {
          error: data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          success: false
        };
      }
    } catch (error) {
      if (attempt === retries) {
        return {
          error: error instanceof Error ? error.message : 'Network error',
          status: 0,
          success: false
        };
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY * (attempt + 1)));
    }
  }

  return {
    error: 'Max retries exceeded',
    status: 0,
    success: false
  };
};

/**
 * Get request with automatic retry
 */
export const apiGet = <T = any>(
  endpoint: string,
  pathParams?: Record<string, string>,
  queryParams?: Record<string, any>,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> => {
  return makeApiRequest<T>(endpoint, { method: 'GET', headers }, pathParams, queryParams);
};

/**
 * Post request with automatic retry
 */
export const apiPost = <T = any>(
  endpoint: string,
  body: any,
  pathParams?: Record<string, string>,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> => {
  return makeApiRequest<T>(endpoint, { method: 'POST', body, headers }, pathParams);
};

/**
 * Put request with automatic retry
 */
export const apiPut = <T = any>(
  endpoint: string,
  body: any,
  pathParams?: Record<string, string>,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> => {
  return makeApiRequest<T>(endpoint, { method: 'PUT', body, headers }, pathParams);
};

/**
 * Patch request with automatic retry
 */
export const apiPatch = <T = any>(
  endpoint: string,
  body: any,
  pathParams?: Record<string, string>,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> => {
  return makeApiRequest<T>(endpoint, { method: 'PATCH', body, headers }, pathParams);
};

/**
 * Delete request with automatic retry
 */
export const apiDelete = <T = any>(
  endpoint: string,
  pathParams?: Record<string, string>,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> => {
  return makeApiRequest<T>(endpoint, { method: 'DELETE', headers }, pathParams);
};

/**
 * Check if response is successful
 */
export const isSuccessResponse = (response: ApiResponse): boolean => {
  return response.success && response.status >= 200 && response.status < 300;
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (status: number): boolean => {
  return status >= 500 || status === 429 || status === 0;
};

/**
 * Extract error message from API response
 */
export const extractErrorMessage = (response: ApiResponse): string => {
  if (response.error) return response.error;
  
  switch (response.status) {
    case HTTP_STATUS.BAD_REQUEST:
      return 'Invalid request data';
    case HTTP_STATUS.UNAUTHORIZED:
      return 'Authentication required';
    case HTTP_STATUS.FORBIDDEN:
      return 'Access denied';
    case HTTP_STATUS.NOT_FOUND:
      return 'Resource not found';
    case HTTP_STATUS.CONFLICT:
      return 'Resource conflict';
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return 'Validation failed';
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      return 'Too many requests - please try again later';
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return 'Server error - please try again';
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      return 'Service temporarily unavailable';
    default:
      return `Unexpected error (${response.status})`;
  }
};

/**
 * Format API error for user display
 */
export const formatApiError = (response: ApiResponse): string => {
  const message = extractErrorMessage(response);
  const isServerError = response.status >= 500;
  
  if (isServerError) {
    return `${message}. Our team has been notified.`;
  }
  
  return message;
};

/**
 * Create pagination parameters
 */
export const createPaginationParams = (page: number = 1, limit: number = 10): Record<string, any> => {
  return {
    page: Math.max(1, page),
    limit: Math.max(1, Math.min(100, limit)), // Cap at 100
    offset: (Math.max(1, page) - 1) * Math.max(1, Math.min(100, limit))
  };
};

/**
 * Create sorting parameters
 */
export const createSortingParams = (
  sortBy?: string, 
  sortOrder: 'asc' | 'desc' = 'desc'
): Record<string, any> => {
  if (!sortBy) return {};
  
  return {
    sortBy,
    sortOrder
  };
};