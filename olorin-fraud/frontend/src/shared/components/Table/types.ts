/**
 * Table Types
 *
 * Type definitions for the shared Table component.
 *
 * @module shared/components/Table/types
 */

import { ReactNode } from 'react';

// ============================================================================
// Column Configuration
// ============================================================================

export type ColumnAlignment = 'left' | 'center' | 'right';
export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  /** Unique column identifier */
  id: string;
  /** Column header text */
  header: string;
  /** Accessor function to get cell value */
  accessor: (row: T) => any;
  /** Optional custom cell renderer */
  cell?: (value: any, row: T) => ReactNode;
  /** Column width (CSS value) */
  width?: string;
  /** Column alignment */
  align?: ColumnAlignment;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Custom sort comparator */
  sortComparator?: (a: T, b: T, direction: SortDirection) => number;
  /** Hide column on mobile */
  hideOnMobile?: boolean;
}

// ============================================================================
// Table Configuration
// ============================================================================

export interface TableConfig<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Enable row selection */
  selectable?: boolean;
  /** Multiple row selection */
  multiSelect?: boolean;
  /** Enable sorting */
  sortable?: boolean;
  /** Enable pagination */
  paginated?: boolean;
  /** Rows per page */
  pageSize?: number;
  /** Show row actions */
  showActions?: boolean;
  /** Row actions renderer */
  renderActions?: (row: T) => ReactNode;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Row key accessor */
  getRowKey: (row: T) => string;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state message */
  loadingMessage?: string;
}

// ============================================================================
// Table State
// ============================================================================

export interface TableSort {
  columnId: string;
  direction: SortDirection;
}

export interface TableSelection<T> {
  selectedRows: Set<string>;
  isRowSelected: (row: T) => boolean;
  toggleRow: (row: T) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  getSelectedRows: () => T[];
}

export interface TablePagination {
  currentPage: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  setPageSize: (size: number) => void;
}

// ============================================================================
// Table Props
// ============================================================================

export interface TableProps<T> {
  /** Table data */
  data: T[];
  /** Table configuration */
  config: TableConfig<T>;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Custom CSS classes */
  className?: string;
  /** Initial sort */
  initialSort?: TableSort;
  /** Selection change handler */
  onSelectionChange?: (selectedRows: T[]) => void;
  /** Sort change handler */
  onSortChange?: (sort: TableSort) => void;
  /** Page change handler */
  onPageChange?: (page: number) => void;
}
