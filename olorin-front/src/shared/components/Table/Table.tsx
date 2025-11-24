/**
 * Table Component
 *
 * Reusable, feature-rich table component with sorting, selection, and pagination.
 * Consolidates scattered table implementations across Investigation, Agent, RAG modules.
 *
 * @module shared/components/Table
 */

import React, { useEffect } from 'react';
import { TableProps } from './types';
import { useTableState } from './useTableState';
import { TableHeader } from './TableHeader';
import { TableBody } from './TableBody';
import { TablePaginationControls } from './TablePagination';

// ============================================================================
// Component Implementation
// ============================================================================

/**
 * Shared Table component with sorting, selection, and pagination
 *
 * @example
 * ```tsx
 * <Table
 *   data={investigations}
 *   config={{
 *     columns: [
 *       { id: 'name', header: 'Name', accessor: (row) => row.name, sortable: true },
 *       { id: 'status', header: 'Status', accessor: (row) => row.status }
 *     ],
 *     selectable: true,
 *     paginated: true,
 *     pageSize: 20,
 *     getRowKey: (row) => row.id
 *   }}
 *   loading={isLoading}
 *   error={error}
 * />
 * ```
 */
export function Table<T>({
  data,
  config,
  loading = false,
  error = null,
  className = '',
  initialSort,
  onSelectionChange,
  onSortChange,
  onPageChange
}: TableProps<T>) {
  // ==========================================================================
  // Table State
  // ==========================================================================

  const { data: displayData, sort, handleSort, selection, pagination } = useTableState(
    data,
    config,
    initialSort
  );

  // ==========================================================================
  // Effect Handlers
  // ==========================================================================

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selection.getSelectedRows());
    }
  }, [selection.selectedRows, onSelectionChange]);

  useEffect(() => {
    if (onSortChange && sort) {
      onSortChange(sort);
    }
  }, [sort, onSortChange]);

  useEffect(() => {
    if (onPageChange) {
      onPageChange(pagination.currentPage);
    }
  }, [pagination.currentPage, onPageChange]);

  // ==========================================================================
  // Render States
  // ==========================================================================

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-2">Error loading data</div>
        <div className="text-sm text-gray-500">{error.message}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <div className="text-sm text-gray-500">
          {config.loadingMessage || 'Loading data...'}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">No data available</div>
        <div className="text-sm text-gray-500">
          {config.emptyMessage || 'No records found'}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // Main Render
  // ==========================================================================

  return (
    <div className={`table-container ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <TableHeader
            config={config}
            sort={sort}
            onSort={handleSort}
            selection={selection}
            allRowsSelected={selection.selectedRows.size === data.length && data.length > 0}
          />
          <TableBody
            data={displayData}
            config={config}
            selection={selection}
          />
        </table>
      </div>

      {config.paginated && (
        <TablePaginationControls
          pagination={pagination}
          className="mt-4"
        />
      )}
    </div>
  );
}
