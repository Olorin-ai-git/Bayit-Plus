/**
 * DataTable Component - Sortable table with glassmorphic styling
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  className = '',
  onRowClick,
  sortKey,
  sortDirection,
  onSort,
}: DataTableProps<T>) {
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (onSort) {
      const newDirection =
        sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(key, newDirection);
    } else {
      const newDirection =
        internalSortKey === key && internalSortDirection === 'asc'
          ? 'desc'
          : 'asc';
      setInternalSortKey(key);
      setInternalSortDirection(newDirection);
    }
  };

  const sortedData = useMemo(() => {
    const currentSortKey = sortKey || internalSortKey;
    const currentDirection = sortDirection || internalSortDirection;

    if (!currentSortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[currentSortKey];
      const bVal = b[currentSortKey];

      if (aVal === bVal) return 0;

      const comparison = aVal < bVal ? -1 : 1;
      return currentDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection, internalSortKey, internalSortDirection]);

  const getSortIcon = (key: string) => {
    const currentSortKey = sortKey || internalSortKey;
    const currentDirection = sortDirection || internalSortDirection;

    if (currentSortKey !== key) return '↕';
    return currentDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className={`glass-md rounded-lg border border-corporate-borderPrimary/40 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-corporate-borderPrimary/40">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-4 py-3 text-left text-sm font-medium text-corporate-textPrimary
                    ${column.sortable ? 'cursor-pointer hover:bg-corporate-bgTertiary/50' : ''}
                    transition-colors duration-200
                  `}
                  onClick={() => column.sortable && handleSort(column.key)}
                  aria-sort={
                    column.sortable
                      ? (sortKey || internalSortKey) === column.key
                        ? sortDirection || internalSortDirection
                        : 'none'
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="text-corporate-textTertiary text-xs">
                        {getSortIcon(column.key)}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={index}
                className={`
                  border-b border-corporate-borderPrimary/20
                  ${onRowClick ? 'cursor-pointer hover:bg-corporate-bgTertiary/30' : ''}
                  transition-colors duration-200
                `}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-3 text-sm text-corporate-textSecondary"
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedData.length === 0 && (
        <div className="p-8 text-center text-corporate-textTertiary">
          No data available
        </div>
      )}
    </div>
  );
}

