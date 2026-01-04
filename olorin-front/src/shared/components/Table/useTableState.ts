/**
 * Table State Hook
 *
 * Custom hook for managing table state (sorting, selection, pagination).
 *
 * @module shared/components/Table/useTableState
 */

import { useState, useCallback, useMemo } from 'react';
import {
  TableSort,
  TableSelection,
  TablePagination,
  SortDirection,
  TableConfig
} from './types';

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTableState<T>(
  data: T[],
  config: TableConfig<T>,
  initialSort?: TableSort
) {
  // ==========================================================================
  // Sorting State
  // ==========================================================================

  const [sort, setSort] = useState<TableSort | null>(initialSort || null);

  const handleSort = useCallback((columnId: string) => {
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) {
        return { columnId, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { columnId, direction: 'desc' };
      }
      return null;
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sort || !config.sortable) return data;

    const column = config.columns.find((col) => col.id === sort.columnId);
    if (!column || !column.sortable) return data;

    const sorted = [...data].sort((a, b) => {
      if (column.sortComparator) {
        return column.sortComparator(a, b, sort.direction);
      }

      const aVal = column.accessor(a);
      const bVal = column.accessor(b);

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [data, sort, config.sortable, config.columns]);

  // ==========================================================================
  // Selection State
  // ==========================================================================

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const isRowSelected = useCallback(
    (row: T) => {
      const key = config.getRowKey(row);
      return selectedRows.has(key);
    },
    [selectedRows, config]
  );

  const toggleRow = useCallback(
    (row: T) => {
      const key = config.getRowKey(row);
      setSelectedRows((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          if (!config.multiSelect) {
            newSet.clear();
          }
          newSet.add(key);
        }
        return newSet;
      });
    },
    [config]
  );

  const toggleAll = useCallback(() => {
    setSelectedRows((prev) => {
      if (prev.size === sortedData.length) {
        return new Set();
      }
      return new Set(sortedData.map(config.getRowKey));
    });
  }, [sortedData, config]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const getSelectedRows = useCallback(() => {
    return sortedData.filter((row) => selectedRows.has(config.getRowKey(row)));
  }, [sortedData, selectedRows, config]);

  const selection: TableSelection<T> = {
    selectedRows,
    isRowSelected,
    toggleRow,
    toggleAll,
    clearSelection,
    getSelectedRows
  };

  // ==========================================================================
  // Pagination State
  // ==========================================================================

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.pageSize || 10);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const paginatedData = useMemo(() => {
    if (!config.paginated) return sortedData;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, pageSize, config.paginated]);

  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const pagination: TablePagination = {
    currentPage,
    pageSize,
    totalRows: sortedData.length,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    setPageSize: handleSetPageSize
  };

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    data: paginatedData,
    sort,
    handleSort,
    selection,
    pagination
  };
}
