/**
 * Generic Filter State Hook
 *
 * Reusable hook for managing filter state across lists and tables.
 * Consolidates scattered filter logic from investigations, agents, RAG.
 *
 * @module shared/hooks/useFilterState
 */

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface FilterConfig<T> {
  /** Filter by search query in specified fields */
  searchFields?: (keyof T)[];
  /** Filter by date range */
  dateField?: keyof T;
  /** Filter by enum values */
  enumFilters?: {
    field: keyof T;
    values: any[];
  }[];
  /** Custom filter function */
  customFilter?: (item: T, filters: FilterState) => boolean;
}

export interface FilterState {
  searchQuery?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  [key: string]: any;
}

export interface UseFilterStateReturn<T> {
  /** Current filter state */
  filters: FilterState;
  /** Filtered items */
  filteredItems: T[];
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Set date range */
  setDateRange: (start: string, end: string) => void;
  /** Set custom filter */
  setFilter: (key: string, value: any) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Clear specific filter */
  clearFilter: (key: string) => void;
  /** Get filter value */
  getFilter: (key: string) => any;
  /** Whether filters are active */
  hasActiveFilters: boolean;
  /** Number of active filters */
  activeFiltersCount: number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Generic hook for managing filter state and filtering items
 *
 * @example
 * ```tsx
 * // Define filter config
 * const investigationFilterConfig: FilterConfig<Investigation> = {
 *   searchFields: ['name', 'investigationId'],
 *   dateField: 'createdAt',
 *   enumFilters: [{
 *     field: 'status',
 *     values: ['pending', 'in_progress', 'completed']
 *   }]
 * };
 *
 * // Use in component
 * const {
 *   filters,
 *   filteredItems,
 *   setSearchQuery,
 *   setFilter,
 *   clearFilters
 * } = useFilterState(investigations, investigationFilterConfig);
 *
 * // Set filters
 * setSearchQuery('test');
 * setFilter('status', ['completed']);
 * ```
 */
export function useFilterState<T>(
  items: T[],
  config: FilterConfig<T> = {}
): UseFilterStateReturn<T> {
  const [filters, setFilters] = useState<FilterState>({});

  // ==========================================================================
  // Filter Actions
  // ==========================================================================

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({
      ...prev,
      searchQuery: query || undefined
    }));
  }, []);

  const setDateRange = useCallback((start: string, end: string) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { start, end }
    }));
  }, []);

  const setFilter = useCallback((key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const clearFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const getFilter = useCallback(
    (key: string) => {
      return filters[key];
    },
    [filters]
  );

  // ==========================================================================
  // Filtering Logic
  // ==========================================================================

  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Search query filter
    if (filters.searchQuery && config.searchFields && config.searchFields.length > 0) {
      const query = filters.searchQuery.toLowerCase();

      filtered = filtered.filter((item) => {
        return config.searchFields!.some((field) => {
          const value = item[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query);
          }
          if (typeof value === 'number') {
            return value.toString().includes(query);
          }
          return false;
        });
      });
    }

    // Date range filter
    if (filters.dateRange && config.dateField) {
      const start = new Date(filters.dateRange.start).getTime();
      const end = new Date(filters.dateRange.end).getTime();

      filtered = filtered.filter((item) => {
        const dateValue = item[config.dateField!];
        if (typeof dateValue === 'string') {
          const timestamp = new Date(dateValue).getTime();
          return timestamp >= start && timestamp <= end;
        }
        return false;
      });
    }

    // Enum filters
    if (config.enumFilters) {
      config.enumFilters.forEach(({ field }) => {
        const filterValues = filters[field as string];
        if (filterValues && Array.isArray(filterValues) && filterValues.length > 0) {
          filtered = filtered.filter((item) => {
            const value = item[field];
            return filterValues.includes(value);
          });
        }
      });
    }

    // Custom filter
    if (config.customFilter) {
      filtered = filtered.filter((item) => config.customFilter!(item, filters));
    }

    return filtered;
  }, [items, filters, config]);

  // ==========================================================================
  // Computed Properties
  // ==========================================================================

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0;
  }, [filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;

    if (filters.searchQuery) count++;
    if (filters.dateRange) count++;

    // Count enum filters
    if (config.enumFilters) {
      config.enumFilters.forEach(({ field }) => {
        const filterValues = filters[field as string];
        if (filterValues && Array.isArray(filterValues) && filterValues.length > 0) {
          count++;
        }
      });
    }

    return count;
  }, [filters, config.enumFilters]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    filters,
    filteredItems,
    setSearchQuery,
    setDateRange,
    setFilter,
    clearFilters,
    clearFilter,
    getFilter,
    hasActiveFilters,
    activeFiltersCount
  };
}

// ============================================================================
// Preset Filter Configs
// ============================================================================

/**
 * Investigation filter config
 */
export const investigationFilterConfig: FilterConfig<any> = {
  searchFields: ['name', 'investigationId'],
  dateField: 'createdAt',
  enumFilters: [
    {
      field: 'status',
      values: ['pending', 'in_progress', 'completed', 'failed', 'cancelled']
    },
    {
      field: 'priority',
      values: ['low', 'medium', 'high', 'critical']
    }
  ]
};

/**
 * Agent filter config
 */
export const agentFilterConfig: FilterConfig<any> = {
  searchFields: ['name', 'agentId', 'type'],
  enumFilters: [
    {
      field: 'status',
      values: ['idle', 'running', 'completed', 'error', 'timeout']
    }
  ]
};

/**
 * RAG document filter config
 */
export const ragDocumentFilterConfig: FilterConfig<any> = {
  searchFields: ['content', 'documentId'],
  customFilter: (item, filters) => {
    // Add custom RAG-specific filtering
    if (filters.minScore && item.score) {
      return item.score >= filters.minScore;
    }
    return true;
  }
};
