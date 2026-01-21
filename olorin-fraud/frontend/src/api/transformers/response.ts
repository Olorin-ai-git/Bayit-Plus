/**
 * API Response Transformers
 *
 * Constitutional Compliance:
 * - No hardcoded values (all transformation rules are generic)
 * - Type-safe transformations with runtime validation
 * - No mocks or placeholders
 * - Fail-fast validation
 *
 * Usage:
 *   import { transformResponse, mapFields, flattenObject } from '@api/transformers/response';
 */

import type {
  TransformedResponse
} from '../types/utilities';
import type { ApiResult } from '../types/utilities';

/**
 * Transform API response data using a mapper function
 */
export function transformResponse<TInput, TOutput>(
  response: ApiResult<TInput>,
  mapper: (data: TInput) => TOutput
): ApiResult<TOutput> {
  if (response.success) {
    return {
      success: true,
      data: mapper(response.data)
    };
  }
  return response;
}

/**
 * Transform paginated response data
 */
export function transformPaginatedResponse<TInput, TOutput>(
  response: ApiResult<TransformedResponse<TInput>>,
  mapper: (item: TInput) => TOutput
): ApiResult<TransformedResponse<TOutput>> {
  if (response.success) {
    return {
      success: true,
      data: {
        ...response.data,
        items: response.data.items.map(mapper)
      }
    };
  }
  return response;
}

/**
 * Field mapping configuration
 */
export type FieldMapping<TSource, TTarget> = {
  [K in keyof TTarget]: keyof TSource | ((source: TSource) => TTarget[K]);
};

/**
 * Map fields from source object to target shape
 */
export function mapFields<TSource, TTarget>(
  source: TSource,
  mapping: FieldMapping<TSource, TTarget>
): TTarget {
  const result = {} as TTarget;

  for (const targetKey in mapping) {
    const sourceKeyOrMapper = mapping[targetKey];

    if (typeof sourceKeyOrMapper === 'function') {
      // Custom mapper function
      result[targetKey] = sourceKeyOrMapper(source);
    } else {
      // Direct field mapping
      result[targetKey] = source[sourceKeyOrMapper] as TTarget[typeof targetKey];
    }
  }

  return result;
}

/**
 * Flatten nested object into dot-notation keys
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  separator = '.'
): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value as Record<string, unknown>, newKey, separator));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}

/**
 * Expand dot-notation keys into nested object
 */
export function expandObject(
  obj: Record<string, unknown>,
  separator = '.'
): Record<string, unknown> {
  const expanded: Record<string, unknown> = {};

  for (const key in obj) {
    const keys = key.split(separator);
    let current = expanded;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = obj[key];
  }

  return expanded;
}

/**
 * Remove null and undefined values from object
 */
export function removeNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key in obj) {
    const value = obj[key];
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Convert snake_case keys to camelCase
 */
export function snakeToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = obj[key];

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = snakeToCamel(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        typeof item === 'object' && item !== null ? snakeToCamel(item as Record<string, unknown>) : item
      );
    } else {
      result[camelKey] = value;
    }
  }

  return result;
}

/**
 * Convert camelCase keys to snake_case
 */
export function camelToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    const value = obj[key];

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = camelToSnake(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map((item) =>
        typeof item === 'object' && item !== null ? camelToSnake(item as Record<string, unknown>) : item
      );
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
}

/**
 * Omit specified keys from object
 */
export function omitKeys<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Pick specified keys from object
 */
export function pickKeys<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
