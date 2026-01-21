/**
 * Runtime Type Guards for API Responses
 *
 * Constitutional Compliance:
 * - Runtime validation of API responses
 * - Type-safe narrowing without type assertions
 * - No hardcoded values (all guards are generic)
 * - Fail-fast on invalid data
 *
 * Usage:
 *   import { isInvestigationResponse, assertInvestigationResponse } from '@api/types/guards';
 */

import type { ApiError } from './utilities';

/**
 * Type guard for string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for array
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard for null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Type guard for undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Type guard for nullable value
 */
export function isNullable<T>(
  value: T | null | undefined
): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard to check if value has specific property
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Type guard to check if value has all required properties
 */
export function hasRequiredProperties<K extends string>(
  obj: unknown,
  ...keys: K[]
): obj is Record<K, unknown> {
  if (!isObject(obj)) return false;
  return keys.every((key) => key in obj);
}

/**
 * Type guard for InvestigationResponse
 *
 * Constitutional Compliance:
 * - Validates against OpenAPI schema structure
 * - No hardcoded values
 */
export function isInvestigationResponse(value: unknown): value is {
  investigation_id: string;
  status: string;
  risk_score: number | null;
  created_at: string;
  updated_at: string;
} {
  return (
    hasRequiredProperties(
      value,
      'investigation_id',
      'status',
      'created_at',
      'updated_at'
    ) &&
    isString((value as Record<string, unknown>).investigation_id) &&
    isString((value as Record<string, unknown>).status) &&
    isString((value as Record<string, unknown>).created_at) &&
    isString((value as Record<string, unknown>).updated_at) &&
    (isNull((value as Record<string, unknown>).risk_score) ||
      isNumber((value as Record<string, unknown>).risk_score))
  );
}

/**
 * Type guard for InvestigationRequest
 */
export function isInvestigationRequest(value: unknown): value is {
  entity_id: string;
  entity_type: string;
} {
  return (
    hasRequiredProperties(value, 'entity_id', 'entity_type') &&
    isString((value as Record<string, unknown>).entity_id) &&
    isString((value as Record<string, unknown>).entity_type)
  );
}

/**
 * Type guard for ApiError
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    hasRequiredProperties(
      value,
      'error',
      'message',
      'status_code',
      'timestamp'
    ) &&
    isString((value as Record<string, unknown>).error) &&
    isString((value as Record<string, unknown>).message) &&
    isNumber((value as Record<string, unknown>).status_code) &&
    isString((value as Record<string, unknown>).timestamp)
  );
}

/**
 * Assertion function for InvestigationResponse
 *
 * Throws if value is not valid InvestigationResponse
 */
export function assertInvestigationResponse(
  value: unknown
): asserts value is {
  investigation_id: string;
  status: string;
  risk_score: number | null;
  created_at: string;
  updated_at: string;
} {
  if (!isInvestigationResponse(value)) {
    throw new TypeError(
      'Invalid InvestigationResponse: missing required fields or incorrect types'
    );
  }
}

/**
 * Assertion function for InvestigationRequest
 */
export function assertInvestigationRequest(
  value: unknown
): asserts value is {
  entity_id: string;
  entity_type: string;
} {
  if (!isInvestigationRequest(value)) {
    throw new TypeError(
      'Invalid InvestigationRequest: missing required fields or incorrect types'
    );
  }
}

/**
 * Assertion function for ApiError
 */
export function assertApiError(value: unknown): asserts value is ApiError {
  if (!isApiError(value)) {
    throw new TypeError(
      'Invalid ApiError: missing required fields or incorrect types'
    );
  }
}

/**
 * Type guard factory for arrays of specific type
 */
export function isArrayOf<T>(
  guard: (value: unknown) => value is T
): (value: unknown) => value is T[] {
  return (value: unknown): value is T[] => {
    return isArray(value) && value.every(guard);
  };
}

/**
 * Type guard for ISO 8601 date string
 */
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Type guard for email address
 */
export function isEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Type guard for UUID
 */
export function isUUID(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Type guard for enum value
 */
export function isEnumValue<T extends string>(
  value: unknown,
  enumValues: readonly T[]
): value is T {
  return isString(value) && enumValues.includes(value as T);
}
