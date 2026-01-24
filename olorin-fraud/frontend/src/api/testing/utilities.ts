/**
 * API Client Testing Utilities
 *
 * Constitutional Compliance:
 * - Configuration-driven test utilities
 * - Type-safe test helpers
 * - No hardcoded values
 * - No mocks in production (test utilities only)
 *
 * Usage:
 *   import { createTestApiClient, waitForApiCall } from '@api/testing/utilities';
 */

import type { ApiResult } from '../types/utilities';
import { ApiClient, createApiClient } from '../client';
import type { AxiosRequestConfig } from 'axios';

/**
 * Test API client configuration
 */
export interface TestApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  enableLogging?: boolean;
}

/**
 * Create API client for testing
 */
export function createTestApiClient(config: TestApiClientConfig = {}): ApiClient {
  return createApiClient({
    baseUrl: config.baseUrl,
    timeout: config.timeout,
    retryAttempts: 0
  });
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall<T>(
  apiCall: () => Promise<ApiResult<T>>,
  timeoutMs: number = 5000
): Promise<ApiResult<T>> {
  return Promise.race([
    apiCall(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('API call timeout')), timeoutMs)
    )
  ]);
}

/**
 * Retry API call until success or max attempts
 */
export async function retryUntilSuccess<T>(
  apiCall: () => Promise<ApiResult<T>>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<ApiResult<T>> {
  let lastResult: ApiResult<T> | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastResult = await apiCall();

    if (lastResult.success) {
      return lastResult;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return lastResult!;
}

/**
 * Create request matcher for testing
 */
export interface RequestMatcher {
  method?: string;
  url?: string | RegExp;
  headers?: Record<string, string>;
  data?: unknown;
}

/**
 * Match request against matcher
 */
export function matchesRequest(
  config: AxiosRequestConfig,
  matcher: RequestMatcher
): boolean {
  if (matcher.method && config.method?.toUpperCase() !== matcher.method.toUpperCase()) {
    return false;
  }

  if (matcher.url) {
    if (typeof matcher.url === 'string') {
      if (config.url !== matcher.url) {
        return false;
      }
    } else {
      if (!matcher.url.test(config.url || '')) {
        return false;
      }
    }
  }

  if (matcher.headers) {
    for (const [key, value] of Object.entries(matcher.headers)) {
      if (config.headers?.[key] !== value) {
        return false;
      }
    }
  }

  if (matcher.data && JSON.stringify(config.data) !== JSON.stringify(matcher.data)) {
    return false;
  }

  return true;
}

/**
 * Request capture for testing
 */
export class RequestCapture {
  private requests: AxiosRequestConfig[] = [];

  capture(config: AxiosRequestConfig): void {
    this.requests.push(config);
  }

  getRequests(): AxiosRequestConfig[] {
    return [...this.requests];
  }

  getLastRequest(): AxiosRequestConfig | undefined {
    return this.requests[this.requests.length - 1];
  }

  getRequestCount(): number {
    return this.requests.length;
  }

  findRequests(matcher: RequestMatcher): AxiosRequestConfig[] {
    return this.requests.filter((req) => matchesRequest(req, matcher));
  }

  clear(): void {
    this.requests = [];
  }
}

/**
 * Create request capture instance
 */
export function createRequestCapture(): RequestCapture {
  return new RequestCapture();
}

/**
 * API response builder for testing
 */
export class ApiResponseBuilder<T> {
  private data: T | null = null;
  private statusCode: number = 200;
  private headers: Record<string, string> = {};

  withData(data: T): this {
    this.data = data;
    return this;
  }

  withStatus(status: number): this {
    this.statusCode = status;
    return this;
  }

  withHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  withHeaders(headers: Record<string, string>): this {
    Object.assign(this.headers, headers);
    return this;
  }

  build(): ApiResult<T> {
    if (this.statusCode >= 200 && this.statusCode < 300) {
      return {
        success: true,
        data: this.data!
      };
    }

    return {
      success: false,
      error: {
        error: 'api_error',
        message: `API error: ${this.statusCode}`,
        status_code: this.statusCode,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Create API response builder
 */
export function createApiResponse<T>(): ApiResponseBuilder<T> {
  return new ApiResponseBuilder<T>();
}

/**
 * Assert API success
 */
export function assertApiSuccess<T>(
  result: ApiResult<T>
): asserts result is { success: true; data: T } {
  if (!result.success) {
    throw new Error(`Expected API success but got error: ${result.error.message}`);
  }
}

/**
 * Assert API failure
 */
export function assertApiFailure<T>(
  result: ApiResult<T>
): asserts result is { success: false; error: { error: string; message: string; status_code: number; timestamp: string } } {
  if (result.success) {
    throw new Error('Expected API failure but got success');
  }
}

/**
 * Get test API configuration
 */
export function getTestApiConfig() {
  return {
    env: 'development' as const,
    // TEST ONLY - Hardcoded fallback allowed for testing utilities
    apiBaseUrl: process.env["TEST_API_BASE_URL"] || 'http://localhost:8090',
    requestTimeoutMs: 5000,
    retryAttempts: 0,
    retryDelayMs: 0,
    paginationSize: 10,
    cacheMaxEntries: 50,
    cacheTtlMs: 60000
  };
}
