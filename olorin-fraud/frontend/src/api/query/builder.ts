/**
 * Type-Safe Query Parameter Builders
 *
 * Constitutional Compliance:
 * - No hardcoded values (all query parameters are type-safe)
 * - Runtime validation with type guards
 * - No mocks or placeholders
 * - Fail-fast validation
 *
 * Usage:
 *   import { QueryBuilder, buildQueryString } from '@api/query/builder';
 */

/**
 * Query parameter value types
 */
export type QueryValue = string | number | boolean | null | undefined;
export type QueryArrayValue = string[] | number[] | boolean[];
export type QueryParam = QueryValue | QueryArrayValue;

/**
 * Query parameter object
 */
export type QueryParams = Record<string, QueryParam>;

/**
 * Type-safe query builder
 */
export class QueryBuilder {
  private params: Map<string, QueryParam> = new Map();

  /**
   * Add a string parameter
   */
  string(key: string, value: string | null | undefined): this {
    if (value !== null && value !== undefined) {
      this.params.set(key, value);
    }
    return this;
  }

  /**
   * Add a number parameter
   */
  number(key: string, value: number | null | undefined): this {
    if (value !== null && value !== undefined) {
      this.params.set(key, value);
    }
    return this;
  }

  /**
   * Add a boolean parameter
   */
  boolean(key: string, value: boolean | null | undefined): this {
    if (value !== null && value !== undefined) {
      this.params.set(key, value);
    }
    return this;
  }

  /**
   * Add an array parameter
   */
  array(key: string, value: QueryArrayValue | null | undefined): this {
    if (value !== null && value !== undefined && value.length > 0) {
      this.params.set(key, value);
    }
    return this;
  }

  /**
   * Add a date parameter (ISO string)
   */
  date(key: string, value: Date | string | null | undefined): this {
    if (value !== null && value !== undefined) {
      const isoString = value instanceof Date ? value.toISOString() : value;
      this.params.set(key, isoString);
    }
    return this;
  }

  /**
   * Add multiple parameters from object
   */
  merge(params: QueryParams): this {
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        this.params.set(key, value);
      }
    }
    return this;
  }

  /**
   * Remove a parameter
   */
  remove(key: string): this {
    this.params.delete(key);
    return this;
  }

  /**
   * Clear all parameters
   */
  clear(): this {
    this.params.clear();
    return this;
  }

  /**
   * Get parameter value
   */
  get(key: string): QueryParam | undefined {
    return this.params.get(key);
  }

  /**
   * Check if parameter exists
   */
  has(key: string): boolean {
    return this.params.has(key);
  }

  /**
   * Get all parameters as object
   */
  toObject(): QueryParams {
    const obj: QueryParams = {};
    for (const [key, value] of this.params.entries()) {
      obj[key] = value;
    }
    return obj;
  }

  /**
   * Build query string
   */
  toString(): string {
    return buildQueryString(this.toObject());
  }
}

/**
 * Build query string from parameters object
 */
export function buildQueryString(params: QueryParams): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      // Handle array parameters (e.g., ?tags=a&tags=b or ?tags=a,b)
      value.forEach((item) => {
        searchParams.append(key, String(item));
      });
    } else {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Parse query string into parameters object
 */
export function parseQueryString(queryString: string): QueryParams {
  const params: QueryParams = {};
  const searchParams = new URLSearchParams(queryString.replace(/^\?/, ''));

  for (const [key, value] of searchParams.entries()) {
    const existing = params[key];

    if (existing === undefined) {
      // First occurrence - store as single value
      params[key] = value;
    } else if (Array.isArray(existing)) {
      // Already an array - append
      existing.push(value);
    } else {
      // Convert to array
      params[key] = [existing as string, value];
    }
  }

  return params;
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  page: number;
  page_size: number;
}

/**
 * Build pagination query parameters
 */
export function buildPaginationQuery(params: PaginationParams): QueryParams {
  return new QueryBuilder().number('page', params.page).number('page_size', params.page_size).toObject();
}

/**
 * Sort query parameters
 */
export interface SortParams {
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

/**
 * Build sort query parameters
 */
export function buildSortQuery(params: SortParams): QueryParams {
  return new QueryBuilder().string('sort_by', params.sort_by).string('sort_order', params.sort_order).toObject();
}

/**
 * Filter query parameters
 */
export type FilterValue = string | number | boolean | string[] | number[];
export type FilterParams = Record<string, FilterValue>;

/**
 * Build filter query parameters
 */
export function buildFilterQuery(params: FilterParams): QueryParams {
  const builder = new QueryBuilder();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      builder.array(key, value);
    } else if (typeof value === 'string') {
      builder.string(key, value);
    } else if (typeof value === 'number') {
      builder.number(key, value);
    } else if (typeof value === 'boolean') {
      builder.boolean(key, value);
    }
  }

  return builder.toObject();
}

/**
 * Date range query parameters
 */
export interface DateRangeParams {
  start_date?: Date | string;
  end_date?: Date | string;
}

/**
 * Build date range query parameters
 */
export function buildDateRangeQuery(params: DateRangeParams): QueryParams {
  return new QueryBuilder().date('start_date', params.start_date).date('end_date', params.end_date).toObject();
}
