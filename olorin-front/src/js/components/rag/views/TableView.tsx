import React, { useState, useMemo } from 'react';
import { BaseViewProps } from './BaseViewComponent';
import {
  FilterCriteria,
  SortCriteria,
  PaginationConfig,
} from '../../../types/EnhancedChatMessage';
import TableSearchControls from './TableSearchControls';
import TablePaginationControls from './TablePaginationControls';
import TableDataGrid from './TableDataGrid';
import TableExportControls from './TableExportControls';
import TablePagination from './TablePagination';

interface TableViewState {
  sortCriteria: SortCriteria | null;
  filterCriteria: FilterCriteria[];
  searchTerm: string;
  pagination: PaginationConfig;
  loading: boolean;
}

export const TableView: React.FC<BaseViewProps> = ({
  message,
  onExport,
  className = '',
}) => {
  const data = useMemo(() => message.structured_data?.data || [], [message.structured_data?.data]);
  const columns = useMemo(() => message.structured_data?.columns || [], [message.structured_data?.columns]);

  const [state, setState] = useState<TableViewState>({
    sortCriteria: null,
    filterCriteria: [],
    searchTerm: '',
    pagination: {
      page: 1,
      page_size: 10,
      total_records: data.length,
    },
    loading: false,
  });

  // Generate columns from data if not provided
  const effectiveColumns = useMemo(() => {
    if (columns.length > 0) return columns;

    if (data.length === 0) return [];

    const firstItem = data[0];
    return Object.keys(firstItem).map((key) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      type: 'string' as const,
      sortable: true,
      filterable: true,
    }));
  }, [columns, data]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (state.searchTerm) {
      const searchLower = state.searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchLower),
        ),
      );
    }

    // Apply sorting
    if (state.sortCriteria) {
      filtered.sort((a, b) => {
        const aVal = a[state.sortCriteria!.column];
        const bVal = b[state.sortCriteria!.column];

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;

        return state.sortCriteria!.direction === 'desc'
          ? -comparison
          : comparison;
      });
    }

    return filtered;
  }, [data, state.searchTerm, state.sortCriteria]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (state.pagination.page - 1) * state.pagination.page_size;
    const endIndex = startIndex + state.pagination.page_size;
    return processedData.slice(startIndex, endIndex);
  }, [processedData, state.pagination]);

  const totalPages = Math.ceil(
    processedData.length / state.pagination.page_size,
  );

  const handleSort = (column: string) => {
    setState((prev) => ({
      ...prev,
      sortCriteria: {
        column,
        direction:
          prev.sortCriteria?.column === column &&
          prev.sortCriteria?.direction === 'asc'
            ? 'desc'
            : 'asc',
      },
    }));
  };

  const handleSearch = (value: string) => {
    setState((prev) => ({
      ...prev,
      searchTerm: value,
      pagination: { ...prev.pagination, page: 1 },
    }));
  };

  const handlePageChange = (newPage: number) => {
    setState((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page: newPage },
    }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setState((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        page_size: pageSize,
        page: 1,
      },
    }));
  };


  if (data.length === 0) {
    return (
      <div
        className={`p-12 text-center text-gray-500 bg-white rounded-lg border ${className}`}
      >
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
        </svg>
        <h3 className="mb-2 text-gray-600 text-lg font-medium">
          No data available
        </h3>
        <p className="text-gray-500 text-sm">
          This response doesn't contain structured data that can be displayed in
          a table.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Table Controls Header */}
      <div className="border-b bg-gray-50 px-4 py-3 rounded-t-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TableSearchControls
            searchTerm={state.searchTerm}
            onSearch={handleSearch}
            resultCount={paginatedData.length}
            totalCount={processedData.length}
          />

          <div className="flex items-center gap-2">
            <TablePaginationControls
              pageSize={state.pagination.page_size}
              onPageSizeChange={handlePageSizeChange}
            />
            
            <TableExportControls
              onExport={onExport}
            />
          </div>
        </div>
      </div>

      {/* Table Data Grid */}
      <TableDataGrid
        columns={effectiveColumns}
        data={paginatedData}
        sortCriteria={state.sortCriteria}
        onSort={handleSort}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <TablePagination
          currentPage={state.pagination.page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default TableView;
