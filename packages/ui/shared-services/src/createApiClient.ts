/**
 * createApiClient
 *
 * Factory for creating configured Axios API clients with consistent
 * security headers, interceptors, and error handling.
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

/**
 * API client configuration options
 */
export interface ApiClientConfig {
  /** Base URL for the API */
  baseURL: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Function to get the current auth token */
  getAuthToken?: () => string | null | Promise<string | null>;
  /** Function to handle auth failures (e.g., logout) */
  onAuthFailure?: () => void;
  /** Function to get correlation ID for request tracing */
  getCorrelationId?: () => string | null;
  /** Function to generate new correlation ID */
  generateCorrelationId?: () => string;
  /** Custom request interceptor */
  onRequest?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  /** Custom response interceptor */
  onResponse?: (response: AxiosResponse) => AxiosResponse;
  /** Custom error handler */
  onError?: (error: unknown) => void;
  /** Additional default headers */
  headers?: Record<string, string>;
  /** Whether to include security headers */
  includeSecurityHeaders?: boolean;
}

/**
 * Security headers for all API requests
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

/**
 * Default correlation ID header name
 */
export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/**
 * Generate a UUID v4 for correlation ID
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a configured Axios API client
 *
 * @param config - Client configuration options
 * @returns Configured Axios instance
 *
 * @example
 * ```typescript
 * const api = createApiClient({
 *   baseURL: 'https://api.example.com',
 *   getAuthToken: () => authStore.getState().token,
 *   onAuthFailure: () => authStore.getState().logout(),
 * });
 *
 * const response = await api.get('/users');
 * ```
 */
export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const {
    baseURL,
    timeout = 15000,
    getAuthToken,
    onAuthFailure,
    getCorrelationId,
    generateCorrelationId = generateUUID,
    onRequest,
    onResponse,
    onError,
    headers: customHeaders = {},
    includeSecurityHeaders = true,
  } = config;

  // Create axios instance
  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      ...(includeSecurityHeaders ? SECURITY_HEADERS : {}),
      ...customHeaders,
    },
    validateStatus: (status) => status >= 200 && status < 500,
  });

  // Request interceptor
  client.interceptors.request.use(
    async (requestConfig) => {
      // Add auth token
      if (getAuthToken) {
        const token = await getAuthToken();
        if (token) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      }

      // Add correlation ID
      const correlationId = getCorrelationId?.() || generateCorrelationId();
      requestConfig.headers[CORRELATION_ID_HEADER] = correlationId;

      // Apply custom interceptor
      if (onRequest) {
        return onRequest(requestConfig);
      }

      return requestConfig;
    },
    (error) => {
      onError?.(error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      // Apply custom response interceptor
      if (onResponse) {
        return onResponse(response);
      }
      return response;
    },
    (error) => {
      onError?.(error);

      // Handle 401 unauthorized
      if (error.response?.status === 401 && onAuthFailure) {
        onAuthFailure();
      }

      return Promise.reject(error.response?.data || error);
    }
  );

  return client;
}

/**
 * Creates an API client with response data extraction
 * Returns response.data directly instead of full response
 *
 * @param config - Client configuration options
 * @returns API client that returns data directly
 */
export function createDataApiClient(config: ApiClientConfig): AxiosInstance {
  const client = createApiClient(config);

  // Modify response interceptor to extract data
  client.interceptors.response.use(
    (response) => response.data,
    (error) => Promise.reject(error)
  );

  return client;
}

/**
 * API error structure
 */
export interface ApiError {
  status: number;
  message: string;
  detail?: string;
  code?: string;
  correlationId?: string;
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
}

/**
 * Extracts error information from various error formats
 */
export function extractApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    return {
      status: error.response?.status || 0,
      message: error.message,
      detail: error.response?.data?.detail || error.response?.data?.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      status: 0,
      message: error.message,
    };
  }

  return {
    status: 0,
    message: 'Unknown error',
  };
}
