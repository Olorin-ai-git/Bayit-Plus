/**
 * Table Header Component
 *
 * Renders table header with sorting controls and selection checkbox.
 *
 * @module shared/components/Table/TableHeader
 */

import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { TableConfig, TableSort, TableSelection } from './types';

// ============================================================================
// Component Props
// ============================================================================

interface TableHeaderProps<T> {
  config: TableConfig<T>;
  sort: TableSort | null;
  onSort: (columnId: string) => void;
  selection: TableSelection<T>;
  allRowsSelected: boolean;
}

// ============================================================================
// Component Implementation
// ============================================================================

export function TableHeader<T>({
  config,
  sort,
  onSort,
  selection,
  allRowsSelected
}: TableHeaderProps<T>) {
  return (
    <thead className="bg-gray-800">
      <tr>
        {/* Selection Column */}
        {config.selectable && config.multiSelect && (
          <th className="px-6 py-3 text-left">
            <input
              type="checkbox"
              checked={allRowsSelected}
              onChange={selection.toggleAll}
              className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
          </th>
        )}

        {/* Data Columns */}
        {config.columns.map((column) => {
          const isSorted = sort?.columnId === column.id;
          const sortDirection = isSorted ? sort?.direction : null;

          return (
            <th
              key={column.id}
              className={`px-6 py-3 text-${column.align || 'left'} text-xs font-medium text-gray-300 uppercase tracking-wider ${
                column.sortable && config.sortable ? 'cursor-pointer hover:bg-gray-700' : ''
              } ${column.hideOnMobile ? 'hidden md:table-cell' : ''}`}
              style={{ width: column.width }}
              onClick={() => {
                if (column.sortable && config.sortable) {
                  onSort(column.id);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <span>{column.header}</span>
                {column.sortable && config.sortable && (
                  <div className="flex flex-col">
                    <ChevronUpIcon
                      className={`h-3 w-3 ${
                        sortDirection === 'asc' ? 'text-blue-400' : 'text-gray-600'
                      }`}
                    />
                    <ChevronDownIcon
                      className={`h-3 w-3 -mt-1 ${
                        sortDirection === 'desc' ? 'text-blue-400' : 'text-gray-600'
                      }`}
                    />
                  </div>
                )}
              </div>
            </th>
          );
        })}

        {/* Actions Column */}
        {config.showActions && (
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
            Actions
          </th>
        )}
      </tr>
    </thead>
  );
}
