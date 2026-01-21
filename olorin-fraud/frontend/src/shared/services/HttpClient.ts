/**
 * HTTP Client - API Communication Layer
 *
 * Configuration-driven HTTP client for backend API communication.
 * Follows SYSTEM MANDATE with no hardcoded values.
 */

import { getConfig, getApiUrl } from '../config/AppConfig';
import { eventBusInstance } from '../events/UnifiedEventBus';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * HTTP Client for API requests
 */
export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retries: number;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.apiBaseUrl;
    this.timeout = config.ui.requestTimeoutMs;
    this.retries = 3;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * GET request
   */
  async get<T = any>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(path: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(path: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(path: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async request<T>(path: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
      retries = this.retries
    } = config;

    const url = getApiUrl(path);
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.executeRequest<T>(url, method, requestHeaders, body, timeout);
        return response;
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
      }
    }

    this.handleError(lastError!, path, method);
    throw lastError;
  }

  /**
   * Execute single HTTP request
   */
  private async executeRequest<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: any,
    timeout?: number
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        data,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Handle request error
   */
  private handleError(error: Error, path: string, method: string): void {
    eventBusInstance.emit('ui:notification:show', {
      notification: {
        id: `api-error-${Date.now()}`,
        type: 'error',
        title: 'API Error',
        message: `${method} ${path}: ${error.message}`,
        duration: 5000
      }
    });
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global HTTP client instance
 */
let globalHttpClient: HttpClient | null = null;

/**
 * Get or create global HTTP client
 */
export function getHttpClient(): HttpClient {
  if (!globalHttpClient) {
    globalHttpClient = new HttpClient();
  }
  return globalHttpClient;
}

/**
 * Reset HTTP client (for testing)
 */
export function resetHttpClient(): void {
  globalHttpClient = null;
}
