/**
 * Response Interceptors
 *
 * Constitutional Compliance:
 * - Configuration-driven interceptor behavior
 * - Type-safe response transformation
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { createResponseInterceptor } from '@api/interceptors/response';
 */

import type { AxiosResponse } from 'axios';
import { getApiConfig } from '../config';
import { getCache } from '../cache';
import { snakeToCamel } from '../transformers/response';

/**
 * Response interceptor function type
 */
export type ResponseInterceptor = (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;

/**
 * Response error interceptor function type
 */
export type ResponseErrorInterceptor = (error: unknown) => Promise<never>;

/**
 * Cache successful responses
 */
export function cacheInterceptor(response: AxiosResponse): AxiosResponse {
  const method = response.config.method?.toUpperCase();

  if (method === 'GET' && response.status === 200) {
    const cache = getCache();
    const url = response.config.url || '';
    const etag = response.headers['etag'];
    const apiConfig = getApiConfig();

    cache.set(url, response.data, apiConfig.cacheTtlMs, etag);
  }

  return response;
}

/**
 * Transform snake_case to camelCase
 */
export function camelCaseInterceptor(response: AxiosResponse): AxiosResponse {
  if (response.data && typeof response.data === 'object') {
    response.data = snakeToCamel(response.data);
  }
  return response;
}

/**
 * Extract data from standard API response wrapper
 */
export function dataExtractionInterceptor(response: AxiosResponse): AxiosResponse {
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    response.data = response.data.data;
  }
  return response;
}

/**
 * Add response metadata
 */
export function metadataInterceptor(response: AxiosResponse): AxiosResponse {
  const metadata = {
    timestamp: new Date().toISOString(),
    duration: response.config.metadata?.requestStartTime
      ? Date.now() - response.config.metadata.requestStartTime
      : undefined,
    statusCode: response.status,
    statusText: response.statusText,
    headers: response.headers,
    requestId: response.config.metadata?.requestId
  };

  response.config.metadata = { ...response.config.metadata, response: metadata };
  return response;
}

/**
 * Log response details (development only)
 */
export function responseLoggerInterceptor(response: AxiosResponse): AxiosResponse {
  const apiConfig = getApiConfig();

  if (apiConfig.env === 'development') {
    const duration = response.config.metadata?.response?.duration;

    console.log('[API Response]', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      duration: duration ? `${duration}ms` : 'unknown',
      data: response.data
    });
  }

  return response;
}

/**
 * Handle 304 Not Modified responses
 */
export function notModifiedInterceptor(response: AxiosResponse): AxiosResponse {
  if (response.status === 304) {
    const cache = getCache();
    const url = response.config.url || '';
    const cached = cache.get(url);

    if (cached) {
      response.data = cached.data;
      response.status = 200;
      response.headers['x-from-cache'] = 'true';
    }
  }

  return response;
}

/**
 * Validate response data against schema
 */
export function responseValidationInterceptor<T>(validate: (data: unknown) => T) {
  return (response: AxiosResponse): AxiosResponse => {
    try {
      response.data = validate(response.data);
    } catch (error) {
      throw new Error(
        `Response validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    return response;
  };
}

/**
 * Handle pagination metadata
 */
export function paginationInterceptor(response: AxiosResponse): AxiosResponse {
  if (response.data && typeof response.data === 'object' && 'items' in response.data) {
    const total = response.headers['x-total-count'];
    const page = response.headers['x-page'];
    const pageSize = response.headers['x-page-size'];

    if (total || page || pageSize) {
      response.data = {
        ...response.data,
        total: total ? parseInt(total, 10) : response.data.total,
        page: page ? parseInt(page, 10) : response.data.page,
        page_size: pageSize ? parseInt(pageSize, 10) : response.data.page_size
      };
    }
  }

  return response;
}

/**
 * Handle rate limit headers
 */
export function rateLimitInterceptor(response: AxiosResponse): AxiosResponse {
  const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
  const rateLimitReset = response.headers['x-ratelimit-reset'];

  if (rateLimitRemaining || rateLimitReset) {
    response.config.metadata = {
      ...response.config.metadata,
      rateLimit: {
        remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : undefined,
        reset: rateLimitReset ? parseInt(rateLimitReset, 10) : undefined
      }
    };
  }

  return response;
}

/**
 * Handle deprecation warnings
 */
export function deprecationInterceptor(response: AxiosResponse): AxiosResponse {
  const deprecation = response.headers['deprecation'];
  const sunset = response.headers['sunset'];
  const link = response.headers['link'];

  if (deprecation || sunset) {
    const warning = {
      deprecated: deprecation === 'true',
      sunset: sunset || undefined,
      migrationGuide: link || undefined
    };

    console.warn('[API Deprecation Warning]', {
      url: response.config.url,
      ...warning
    });

    response.config.metadata = {
      ...response.config.metadata,
      deprecation: warning
    };
  }

  return response;
}

/**
 * Transform empty responses to null
 */
export function emptyResponseInterceptor(response: AxiosResponse): AxiosResponse {
  if (response.status === 204 || (response.status === 200 && !response.data)) {
    response.data = null;
  }
  return response;
}

/**
 * Add ETag to cache metadata
 */
export function etagInterceptor(response: AxiosResponse): AxiosResponse {
  const etag = response.headers['etag'];

  if (etag) {
    response.config.metadata = {
      ...response.config.metadata,
      etag
    };
  }

  return response;
}

/**
 * Create composite response interceptor
 */
export function createResponseInterceptor(
  interceptors: ResponseInterceptor[]
): ResponseInterceptor {
  return async (response: AxiosResponse) => {
    let currentResponse = response;

    for (const interceptor of interceptors) {
      currentResponse = await interceptor(currentResponse);
    }

    return currentResponse;
  };
}

/**
 * Default response interceptors
 */
export function getDefaultResponseInterceptors(): ResponseInterceptor[] {
  return [
    metadataInterceptor,
    notModifiedInterceptor,
    etagInterceptor,
    rateLimitInterceptor,
    deprecationInterceptor,
    paginationInterceptor,
    emptyResponseInterceptor,
    cacheInterceptor,
    responseLoggerInterceptor
  ];
}
