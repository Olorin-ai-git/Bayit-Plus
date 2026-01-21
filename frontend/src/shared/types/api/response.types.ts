/**
 * Canonical API Response Types
 * SINGLE SOURCE OF TRUTH for all API response types
 */

export interface APIError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

/**
 * Standard API response wrapper
 * This is the ONLY APIResponse type definition in the codebase
 */
export interface APIResponse<T = any> {
  data: T;
  status: number;
  message: string;
  timestamp: string;
  errors?: APIError[];
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
