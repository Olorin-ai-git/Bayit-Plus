/**
 * Pagination Utilities
 *
 * Constitutional Compliance:
 * - Configuration-driven pagination sizes
 * - Type-safe pagination state management
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { usePagination, calculatePagination } from '@api/pagination/utilities';
 */

import { useState, useCallback } from 'react';
import type { Paginated } from '../types/utilities';
import { getApiConfig } from '../config';

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
}

/**
 * Pagination controls
 */
export interface PaginationControls {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

/**
 * Pagination hook options
 */
export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

/**
 * Pagination hook
 */
export function usePagination(
  data: Paginated<unknown> | null,
  options: UsePaginationOptions = {}
): PaginationControls {
  const config = getApiConfig();
  const defaultPageSize = config.paginationSize;

  const [page, setPage] = useState(options.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(options.initialPageSize ?? defaultPageSize);

  const totalPages = data?.total_pages ?? 0;
  const totalItems = data?.total ?? 0;
  const hasNext = data?.has_next ?? false;
  const hasPrevious = data?.has_previous ?? false;

  const goToPage = useCallback(
    (newPage: number) => {
      const clampedPage = Math.max(1, Math.min(newPage, totalPages));
      setPage(clampedPage);
      options.onPageChange?.(clampedPage);
    },
    [totalPages, options]
  );

  const nextPage = useCallback(() => {
    if (hasNext) {
      goToPage(page + 1);
    }
  }, [hasNext, page, goToPage]);

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      goToPage(page - 1);
    }
  }, [hasPrevious, page, goToPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [totalPages, goToPage]);

  const handleSetPageSize = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      setPage(1);
      options.onPageSizeChange?.(newSize);
    },
    [options]
  );

  const reset = useCallback(() => {
    setPage(options.initialPage ?? 1);
    setPageSize(options.initialPageSize ?? defaultPageSize);
  }, [options.initialPage, options.initialPageSize, defaultPageSize]);

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    hasNext,
    hasPrevious,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize: handleSetPageSize,
    reset
  };
}

/**
 * Calculate pagination metadata
 */
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Calculate pagination metadata from total items and current page
 */
export function calculatePagination(totalItems: number, page: number, pageSize: number): PaginationMetadata {
  const totalPages = Math.ceil(totalItems / pageSize);
  const clampedPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const hasNext = clampedPage < totalPages;
  const hasPrevious = clampedPage > 1;

  return {
    page: clampedPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    hasNext,
    hasPrevious
  };
}

/**
 * Get page range for pagination UI
 */
export interface PageRange {
  start: number;
  end: number;
  pages: number[];
}

/**
 * Calculate page range for pagination UI (e.g., [1, 2, 3, ..., 10])
 */
export function getPageRange(currentPage: number, totalPages: number, maxVisible: number = 7): PageRange {
  if (totalPages <= maxVisible) {
    return {
      start: 1,
      end: totalPages,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1)
    };
  }

  const halfVisible = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - halfVisible);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  const pages: number[] = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return { start, end, pages };
}

/**
 * Paginate array in memory
 */
export function paginateArray<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const totalItems = items.length;
  const { totalPages, startIndex, endIndex, hasNext, hasPrevious } = calculatePagination(
    totalItems,
    page,
    pageSize
  );

  return {
    items: items.slice(startIndex, endIndex),
    total: totalItems,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    has_next: hasNext,
    has_previous: hasPrevious
  };
}

/**
 * Page size options (common values from configuration)
 */
export function getPageSizeOptions(): number[] {
  const config = getApiConfig();
  const defaultSize = config.paginationSize;

  return [
    Math.floor(defaultSize / 2),
    defaultSize,
    defaultSize * 2,
    defaultSize * 5
  ];
}
