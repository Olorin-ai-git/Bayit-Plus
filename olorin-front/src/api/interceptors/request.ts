/**
 * Request Interceptors
 *
 * Constitutional Compliance:
 * - Configuration-driven interceptor behavior
 * - Type-safe request validation
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { createRequestInterceptor } from '@api/interceptors/request';
 */

import type { InternalAxiosRequestConfig } from 'axios';
import { getApiConfig } from '../config';

/**
 * Request interceptor function type
 */
export type RequestInterceptor = (
  config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;

/**
 * Request error interceptor function type
 */
export type RequestErrorInterceptor = (error: unknown) => Promise<never>;

/**
 * Add timestamp to request headers
 */
export function timestampInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  config.headers['X-Request-Timestamp'] = new Date().toISOString();
  return config;
}

/**
 * Add request ID for tracking
 */
export function requestIdInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  config.headers['X-Request-ID'] = requestId;
  config.metadata = { ...config.metadata, requestId };
  return config;
}

/**
 * Add API version header
 */
export function apiVersionInterceptor(version: string = 'v1') {
  return (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    config.headers['X-API-Version'] = version;
    return config;
  };
}

/**
 * Add authentication token
 */
export function authInterceptor(getToken: () => string | null) {
  return (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  };
}

/**
 * Add content type for requests with body
 */
export function contentTypeInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (config.data && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
}

/**
 * Validate request body against schema
 */
export function validationInterceptor<T>(
  validate: (data: unknown) => T,
  methods: string[] = ['POST', 'PUT', 'PATCH']
) {
  return (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const method = config.method?.toUpperCase();

    if (method && methods.includes(method) && config.data) {
      try {
        config.data = validate(config.data);
      } catch (error) {
        throw new Error(
          `Request validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return config;
  };
}

/**
 * Add ETag for conditional requests
 */
export function etagInterceptor(getEtag: (url: string) => string | null) {
  return (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (config.method?.toUpperCase() === 'GET' && config.url) {
      const etag = getEtag(config.url);
      if (etag) {
        config.headers['If-None-Match'] = etag;
      }
    }
    return config;
  };
}

/**
 * Add timeout from configuration
 */
export function timeoutInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (!config.timeout) {
    const apiConfig = getApiConfig();
    config.timeout = apiConfig.requestTimeoutMs;
  }
  return config;
}

/**
 * Add accept header
 */
export function acceptInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (!config.headers['Accept']) {
    config.headers['Accept'] = 'application/json';
  }
  return config;
}

/**
 * Add custom headers from configuration
 */
export function customHeadersInterceptor(headers: Record<string, string>) {
  return (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    Object.assign(config.headers, headers);
    return config;
  };
}

/**
 * Log request details (development only)
 */
export function requestLoggerInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const apiConfig = getApiConfig();

  if (apiConfig.env === 'development') {
    console.log('[API Request]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
      data: config.data,
      params: config.params
    });
  }

  return config;
}

/**
 * Sanitize sensitive data from request
 */
export function sanitizeInterceptor(
  sensitiveFields: string[] = ['password', 'token', 'secret', 'apiKey']
) {
  return (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (config.data && typeof config.data === 'object') {
      const sanitized = { ...config.data };

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '***REDACTED***';
        }
      }

      config.metadata = { ...config.metadata, sanitizedData: sanitized };
    }

    return config;
  };
}

/**
 * Add rate limiting metadata
 */
export function rateLimitInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const now = Date.now();
  config.metadata = {
    ...config.metadata,
    requestStartTime: now,
    rateLimitKey: `${config.method}:${config.url}`
  };
  return config;
}

/**
 * Add retry metadata
 */
export function retryMetadataInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const apiConfig = getApiConfig();

  if (!('retriesLeft' in config)) {
    config['retriesLeft'] = apiConfig.retryAttempts;
  }

  return config;
}

/**
 * Create composite request interceptor
 */
export function createRequestInterceptor(
  interceptors: RequestInterceptor[]
): RequestInterceptor {
  return async (config: InternalAxiosRequestConfig) => {
    let currentConfig = config;

    for (const interceptor of interceptors) {
      currentConfig = await interceptor(currentConfig);
    }

    return currentConfig;
  };
}

/**
 * Default request interceptors
 */
export function getDefaultRequestInterceptors(): RequestInterceptor[] {
  return [
    timestampInterceptor,
    requestIdInterceptor,
    contentTypeInterceptor,
    acceptInterceptor,
    timeoutInterceptor,
    retryMetadataInterceptor,
    requestLoggerInterceptor
  ];
}
