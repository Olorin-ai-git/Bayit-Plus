/**
 * Case Conversion Utilities
 * Feature: 007-progress-wizard-page
 *
 * Transforms API responses from snake_case to camelCase.
 * Handles nested objects, arrays, and Date string conversion.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Pure functions
 * - Handle edge cases gracefully
 */

/**
 * Converts a snake_case string to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Checks if a string is an ISO 8601 datetime
 */
function isISODateString(value: any): boolean {
  if (typeof value !== 'string') return false;
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  return isoPattern.test(value);
}

/**
 * Transforms snake_case object keys to camelCase recursively
 * Also converts ISO datetime strings to Date objects
 *
 * @param data - Object with snake_case keys
 * @returns Object with camelCase keys and Date objects
 */
export function snakeToCamel<T = any>(data: any): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data as any;
  }

  // Handle ISO datetime strings
  if (isISODateString(data)) {
    return new Date(data) as any;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => snakeToCamel(item)) as any;
  }

  // Handle objects
  if (typeof data === 'object') {
    const camelCased: any = {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const camelKey = toCamelCase(key);
        camelCased[camelKey] = snakeToCamel(data[key]);
      }
    }

    return camelCased;
  }

  // Return primitive values as-is
  return data;
}

/**
 * Converts camelCase string to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Transforms camelCase object keys to snake_case recursively
 *
 * @param data - Object with camelCase keys
 * @returns Object with snake_case keys
 */
export function camelToSnake<T = any>(data: any): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Date objects - convert to ISO string
  if (data instanceof Date) {
    return data.toISOString() as any;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => camelToSnake(item)) as any;
  }

  // Handle objects
  if (typeof data === 'object') {
    const snakeCased: any = {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const snakeKey = toSnakeCase(key);
        snakeCased[snakeKey] = camelToSnake(data[key]);
      }
    }

    return snakeCased;
  }

  // Return primitive values as-is
  return data;
}
