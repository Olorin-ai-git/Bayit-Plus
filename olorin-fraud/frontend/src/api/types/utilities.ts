/**
 * Generic Type Utilities for API Responses
 *
 * Constitutional Compliance:
 * - All types are generic and reusable (no hardcoded values)
 * - Type-safe API response handling
 * - Proper null/undefined handling with strict TypeScript
 * - No mocks or placeholders
 *
 * Usage:
 *   import { ApiResponse, ApiError, Paginated } from '@api/types/utilities';
 */

/**
 * Standard API response wrapper
 *
 * Wraps all API responses with consistent structure
 */
export type ApiResponse<T> = {
  data: T;
  status: number;
  headers: Record<string, string>;
  timestamp: string;
};

/**
 * API error response structure
 *
 * Constitutional Compliance:
 * - Consistent error format across all endpoints
 * - Type-safe error handling
 */
export type ApiError = {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  status_code: number;
  timestamp: string;
};

/**
 * Paginated API response
 *
 * Generic type for paginated results
 */
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

/**
 * API request state for UI components
 *
 * Tracks loading, error, and data states
 */
export type ApiRequestState<T> = {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
};

/**
 * Type guard to check if response is an error
 */
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    'message' in response &&
    'status_code' in response
  );
}

/**
 * Type guard to check if response is paginated
 */
export function isPaginated<T>(response: unknown): response is Paginated<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'items' in response &&
    'total' in response &&
    'page' in response &&
    'page_size' in response &&
    Array.isArray((response as Paginated<T>).items)
  );
}

/**
 * Extract data type from ApiResponse
 *
 * Example:
 *   type Investigation = ExtractApiData<ApiResponse<InvestigationResponse>>;
 */
export type ExtractApiData<T> = T extends ApiResponse<infer D> ? D : never;

/**
 * Make all properties of T optional except K
 *
 * Example:
 *   type PartialInvestigation = RequireOnly<InvestigationRequest, 'entity_id' | 'entity_type'>;
 */
export type RequireOnly<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make all properties of T required except K
 *
 * Example:
 *   type RequiredInvestigation = OptionalOnly<InvestigationRequest, 'time_range'>;
 */
export type OptionalOnly<T, K extends keyof T> = Required<Omit<T, K>> & Partial<Pick<T, K>>;

/**
 * Nullable fields utility
 *
 * Makes specific fields nullable
 */
export type Nullable<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};

/**
 * NonNullable fields utility
 *
 * Ensures specific fields are never null
 */
export type NonNullableFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: NonNullable<T[P]>;
};

/**
 * Deep Partial utility
 *
 * Makes all properties of T and nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep Required utility
 *
 * Makes all properties of T and nested properties required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * API response success result
 *
 * Used for discriminated unions
 */
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

/**
 * API response failure result
 *
 * Used for discriminated unions
 */
export type ApiFailure = {
  success: false;
  error: ApiError;
};

/**
 * API result discriminated union
 *
 * Type-safe result handling without exceptions
 */
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/**
 * Type guard for API success
 */
export function isApiSuccess<T>(result: ApiResult<T>): result is ApiSuccess<T> {
  return result.success === true;
}

/**
 * Type guard for API failure
 */
export function isApiFailure<T>(result: ApiResult<T>): result is ApiFailure {
  return result.success === false;
}
