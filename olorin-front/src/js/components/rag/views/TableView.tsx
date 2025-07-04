import React, { useState, useMemo } from 'react';
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Typography,
  Paper,
  Chip,
  Pagination,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowUpward as SortAscIcon,
  ArrowDownward as SortDescIcon,
  UnfoldMore as SortIcon,
  Search as SearchIcon,
  GetApp as ExportIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  TableChart as TableIcon,
} from '@mui/icons-material';
import { BaseViewProps, ViewComponentConfig } from './BaseViewComponent';
import {
  ColumnDefinition,
  FilterCriteria,
  SortCriteria,
  PaginationConfig,
} from '../../../types/EnhancedChatMessage';

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
  const data = message.structured_data?.data || [];
  const columns = message.structured_data?.columns || [];
  const metadata = message.structured_data?.metadata;

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

  const getSortIcon = (column: string) => {
    if (state.sortCriteria?.column !== column)
      return <SortIcon className="h-4 w-4" />;
    return state.sortCriteria.direction === 'asc' ? (
      <SortAscIcon className="h-4 w-4" />
    ) : (
      <SortDescIcon className="h-4 w-4" />
    );
  };

  const formatCellValue = (value: any, column: ColumnDefinition) => {
    if (value === null || value === undefined) return '-';

    switch (column.type) {
      case 'number':
        return Number(value).toLocaleString();
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  };

  if (data.length === 0) {
    return (
      <div
        className={`p-12 text-center text-gray-500 bg-white rounded-lg border ${className}`}
      >
        <TableIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <Typography variant="h6" className="mb-2 text-gray-600">
          No data available
        </Typography>
        <Typography variant="body2" className="text-gray-500">
          This response doesn't contain structured data that can be displayed in
          a table.
        </Typography>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Table Controls Header */}
      <div className="border-b bg-gray-50 px-4 py-3 rounded-t-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <TextField
                placeholder="Search all columns..."
                size="small"
                value={state.searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 min-w-64"
              />
            </div>

            {/* Results info */}
            <div className="text-sm text-gray-600">
              Showing {paginatedData.length} of {processedData.length} records
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <Select
                value={state.pagination.page_size}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                size="small"
                className="min-w-20"
              >
                {[5, 10, 25, 50, 100].map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </div>

            {/* Export buttons */}
            <div className="flex gap-1">
              <Button
                variant="outlined"
                size="small"
                startIcon={<ExportIcon className="w-4 h-4" />}
                onClick={() => onExport?.('csv')}
                className="text-xs"
              >
                CSV
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ExportIcon className="w-4 h-4" />}
                onClick={() => onExport?.('json')}
                className="text-xs"
              >
                JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow className="bg-gray-50">
              {effectiveColumns.map((column) => (
                <TableCell
                  key={column.key}
                  className="font-semibold text-gray-900 bg-gray-50 border-b-2 border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {getSortIcon(column.key)}
                      </button>
                    )}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow
                key={index}
                className="hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                {effectiveColumns.map((column) => (
                  <TableCell
                    key={column.key}
                    className="text-gray-800 py-3 border-b border-gray-100"
                  >
                    <div className="max-w-xs">
                      <span
                        className="block truncate"
                        title={String(row[column.key])}
                      >
                        {formatCellValue(row[column.key], column)}
                      </span>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t bg-gray-50 px-4 py-3 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {state.pagination.page} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                size="small"
                startIcon={<PrevIcon className="w-4 h-4" />}
                disabled={state.pagination.page === 1}
                onClick={() => handlePageChange(state.pagination.page - 1)}
                className="text-xs"
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        state.pagination.page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outlined"
                size="small"
                startIcon={<NextIcon className="w-4 h-4" />}
                disabled={state.pagination.page === totalPages}
                onClick={() => handlePageChange(state.pagination.page + 1)}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableView;
