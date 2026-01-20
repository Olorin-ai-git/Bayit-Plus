/**
 * createService
 *
 * Factory for creating API service classes with consistent patterns
 * for CRUD operations and error handling.
 */

import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { extractApiError, ApiError } from './createApiClient';

/**
 * Service configuration options
 */
export interface ServiceConfig {
  /** API client instance */
  client: AxiosInstance;
  /** Base path for the service (e.g., '/users') */
  basePath: string;
}

/**
 * Response wrapper for service operations
 */
export interface ServiceResponse<T> {
  data: T;
  success: true;
}

/**
 * Error response for service operations
 */
export interface ServiceErrorResponse {
  error: ApiError;
  success: false;
}

/**
 * Combined result type for service operations
 */
export type ServiceResult<T> = ServiceResponse<T> | ServiceErrorResponse;

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Creates a base service with CRUD operations
 *
 * @param config - Service configuration
 * @returns Service object with CRUD methods
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * const userService = createService<User>({
 *   client: api,
 *   basePath: '/users',
 * });
 *
 * const users = await userService.list();
 * const user = await userService.get('123');
 * const newUser = await userService.create({ name: 'John', email: 'john@example.com' });
 * ```
 */
export function createService<T extends { id: string | number }>(
  config: ServiceConfig
) {
  const { client, basePath } = config;

  return {
    /**
     * List all items with optional pagination
     */
    async list(
      params?: PaginationParams & Record<string, unknown>,
      requestConfig?: AxiosRequestConfig
    ): Promise<ServiceResult<T[]>> {
      try {
        const response = await client.get<T[]>(basePath, {
          params,
          ...requestConfig,
        });
        return { data: response.data, success: true };
      } catch (error) {
        return { error: extractApiError(error), success: false };
      }
    },

    /**
     * List items with pagination metadata
     */
    async listPaginated(
      params?: PaginationParams & Record<string, unknown>,
      requestConfig?: AxiosRequestConfig
    ): Promise<ServiceResult<PaginatedResponse<T>>> {
      try {
        const response = await client.get<PaginatedResponse<T>>(basePath, {
          params,
          ...requestConfig,
        });
        return { data: response.data, success: true };
      } catch (error) {
        return { error: extractApiError(error), success: false };
      }
    },

    /**
     * Get a single item by ID
     */
    async get(
      id: string | number,
      requestConfig?: AxiosRequestConfig
    ): Promise<ServiceResult<T>> {
      try {
        const response = await client.get<T>(`${basePath}/${id}`, requestConfig);
        return { data: response.data, success: true };
      } catch (error) {
        return { error: extractApiError(error), success: false };
      }
    },

    /**
     * Create a new item
     */
    async create(
      data: Omit<T, 'id'> | Partial<T>,
      requestConfig?: AxiosRequestConfig
    ): Promise<ServiceResult<T>> {
      try {
        const response = await client.post<T>(basePath, data, requestConfig);
        return { data: response.data, success: true };
      } catch (error) {
        return { error: extractApiError(error), success: false };
      }
    },

    /**
     * Update an existing item
     */
    async update(
      id: string | number,
      data: Partial<T>,
      requestConfig?: AxiosRequestConfig
    ): Promise<ServiceResult<T>> {
      try {
        const response = await client.put<T>(
          `${basePath}/${id}`,
          data,
          requestConfig
        );
        return { data: response.data, success: true };
      } catch (error) {
        return { error: extractApiError(error), success: false };
      }
    },

    /**
     * Partially update an existing item
     */
    async patch(
      id: string | number,
      data: Partial<T>,
      requestConfig?: AxiosRequestConfig
    ): Promise<ServiceResult<T>> {
      try {
        const response = await client.patch<T>(
          `${basePath}/${id}`,
          data,
          requestConfig
        );
        return { data: response.data, success: true };
      } catch (error) {
        return { error: extractApiError(error), success: false };
      }
    },

    /**
     * Delete an item
     */
    async delete(
      id: string | number,
      requestConfig?: AxiosRequestConfig
    ): Promise<ServiceResult<void>> {
      try {
        await client.delete(`${basePath}/${id}`, requestConfig);
        return { data: undefined, success: true };
      } catch (error) {
        return { error: extractApiError(error), success: false };
      }
    },

    /**
     * Custom request helper
     */
    async request<R>(
      method: 'get' | 'post' | 'put' | 'patch' | 'delete',
      path: string,
      data?: unknown,
      requestConfig?: AxiosRequestConfig
    ): Promise<ServiceResult<R>> {
      try {
        const fullPath = path.startsWith('/') ? path : `${basePath}/${path}`;
        const response = await client.request<R>({
          method,
          url: fullPath,
          data,
          ...requestConfig,
        });
        return { data: response.data, success: true };
      } catch (error) {
        return { error: extractApiError(error), success: false };
      }
    },
  };
}

/**
 * Type for the service returned by createService
 */
export type BaseService<T extends { id: string | number }> = ReturnType<
  typeof createService<T>
>;
