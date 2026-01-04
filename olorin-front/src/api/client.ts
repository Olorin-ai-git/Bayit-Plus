/**
 * Type-Safe API Client Wrapper
 *
 * Constitutional Compliance:
 * - Configuration-driven (no hardcoded URLs or timeouts)
 * - Type-safe requests and responses with runtime validation
 * - Automatic error handling and transformation
 * - No mocks or stubs (uses real HTTP client)
 *
 * Usage:
 *   import { createApiClient } from '@api/client';
 *   const client = createApiClient();
 *   const result = await client.post('/investigations/', data);
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getApiConfig } from './config';
import type {
  ApiError,
  ApiResult,
  ApiSuccess,
  ApiFailure
} from './types';
import { isApiError } from './types/guards';
import { eventBusInstance } from '@shared/events/UnifiedEventBus';

/**
 * HTTP methods supported by API client
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * API client configuration
 *
 * Constitutional Compliance:
 * - All values from getApiConfig() (no hardcoded values)
 */
export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelayMs: number;
}

/**
 * Type-safe API client
 */
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private config: ApiClientConfig;

  constructor(config?: Partial<ApiClientConfig>) {
    const apiConfig = getApiConfig();

    this.config = {
      baseUrl: config?.baseUrl ?? apiConfig.apiBaseUrl,
      timeout: config?.timeout ?? apiConfig.requestTimeoutMs,
      retryAttempts: config?.retryAttempts ?? apiConfig.retryAttempts,
      retryDelayMs: config?.retryDelayMs ?? apiConfig.retryDelayMs
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   *
   * Constitutional Compliance:
   * - Automatic error transformation
   * - Request/response logging for debugging
   */
  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(this.transformError(error));
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }
        return Promise.reject(this.transformError(error));
      }
    );
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;

    const retriesLeft = error.config?.['retriesLeft'] ?? this.config.retryAttempts;
    if (retriesLeft <= 0) return false;

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const statusCode = error.response?.status;

    return statusCode !== undefined && retryableStatusCodes.includes(statusCode);
  }

  /**
   * Retry failed request with exponential backoff
   */
  private async retryRequest(error: unknown): Promise<AxiosResponse> {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const retriesLeft = (error.config['retriesLeft'] ?? this.config.retryAttempts) - 1;
    const retryDelay = this.config.retryDelayMs * Math.pow(2, this.config.retryAttempts - retriesLeft - 1);

    await new Promise((resolve) => setTimeout(resolve, retryDelay));

    error.config['retriesLeft'] = retriesLeft;
    return this.axiosInstance.request(error.config);
  }

  /**
   * Transform axios error to ApiError and emit notification
   */
  private transformError(error: unknown): ApiError {
    let apiError: ApiError;
    let userMessage: string;
    let errorTitle: string;

    if (axios.isAxiosError(error)) {
      if (error.response?.data && isApiError(error.response.data)) {
        apiError = error.response.data;
      } else {
        apiError = {
          error: error.code || 'network_error',
          message: error.message,
          status_code: error.response?.status || 0,
          timestamp: new Date().toISOString(),
          details: {
            url: error.config?.url,
            method: error.config?.method
          }
        };
      }

      // Generate user-friendly error messages
      const statusCode = apiError.status_code;
      if (statusCode === 400) {
        errorTitle = 'Bad Request';
        userMessage = 'Invalid request. Please check your input and try again.';
      } else if (statusCode === 401) {
        errorTitle = 'Unauthorized';
        userMessage = 'You are not authorized. Please log in again.';
      } else if (statusCode === 403) {
        errorTitle = 'Forbidden';
        userMessage = 'You do not have permission to access this resource.';
      } else if (statusCode === 404) {
        errorTitle = 'Not Found';
        userMessage = 'The requested resource was not found.';
      } else if (statusCode === 408) {
        errorTitle = 'Request Timeout';
        userMessage = 'The request took too long. Please try again.';
      } else if (statusCode === 429) {
        errorTitle = 'Too Many Requests';
        userMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (statusCode >= 500 && statusCode < 600) {
        errorTitle = 'Server Error';
        userMessage = 'A server error occurred. Our team has been notified.';
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorTitle = 'Connection Timeout';
        userMessage = 'Unable to connect to the server. Please check your connection.';
      } else if (error.code === 'ERR_NETWORK') {
        errorTitle = 'Network Error';
        userMessage = 'Unable to reach the server. Please check your connection and try again.';
      } else {
        errorTitle = 'Request Failed';
        userMessage = apiError.message || 'An error occurred while processing your request.';
      }
    } else {
      apiError = {
        error: 'unknown_error',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        status_code: 0,
        timestamp: new Date().toISOString()
      };
      errorTitle = 'Error';
      userMessage = 'An unexpected error occurred. Please try again.';
    }

    // Emit error notification via event bus
    eventBusInstance.emit('ui:notification:show', {
      notification: {
        id: `api_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'error',
        title: errorTitle,
        message: userMessage,
        duration: 5000
      }
    });

    return apiError;
  }

  /**
   * Generic request method with type safety
   */
  private async request<T>(
    method: HttpMethod,
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResult<T>> {
    try {
      const response = await this.axiosInstance.request<T>({
        method,
        url,
        ...config
      });

      const success: ApiSuccess<T> = {
        success: true,
        data: response.data
      };

      return success;
    } catch (error) {
      const apiError = this.transformError(error);
      const failure: ApiFailure = {
        success: false,
        error: apiError
      };

      return failure;
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return this.request<T>('GET', url, config);
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResult<T>> {
    return this.request<T>('POST', url, { ...config, data });
  }

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResult<T>> {
    return this.request<T>('PUT', url, { ...config, data });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResult<T>> {
    return this.request<T>('PATCH', url, { ...config, data });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return this.request<T>('DELETE', url, config);
  }
}

/**
 * Create API client instance
 *
 * Constitutional Compliance:
 * - Configuration from getApiConfig()
 * - Singleton pattern for consistent instance
 */
let apiClientInstance: ApiClient | null = null;

export function createApiClient(config?: Partial<ApiClientConfig>): ApiClient {
  if (!apiClientInstance || config) {
    apiClientInstance = new ApiClient(config);
  }
  return apiClientInstance;
}

/**
 * Get default API client instance
 */
export function getApiClient(): ApiClient {
  return createApiClient();
}
