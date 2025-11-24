/**
 * Table Body Component
 *
 * Renders table body with rows and cells.
 *
 * @module shared/components/Table/TableBody
 */

import React from 'react';
import { TableConfig, TableSelection } from './types';

// ============================================================================
// Component Props
// ============================================================================

interface TableBodyProps<T> {
  data: T[];
  config: TableConfig<T>;
  selection: TableSelection<T>;
}

// ============================================================================
// Component Implementation
// ============================================================================

export function TableBody<T>({ data, config, selection }: TableBodyProps<T>) {
  return (
    <tbody className="bg-gray-900 divide-y divide-gray-800">
      {data.map((row) => {
        const rowKey = config.getRowKey(row);
        const isSelected = selection.isRowSelected(row);

        return (
          <tr
            key={rowKey}
            className={`hover:bg-gray-800 transition-colors ${
              config.onRowClick ? 'cursor-pointer' : ''
            } ${isSelected ? 'bg-blue-900/20' : ''}`}
            onClick={() => {
              if (config.onRowClick) {
                config.onRowClick(row);
              }
            }}
          >
            {/* Selection Column */}
            {config.selectable && (
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    selection.toggleRow(row);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
              </td>
            )}

            {/* Data Columns */}
            {config.columns.map((column) => {
              const value = column.accessor(row);
              const cellContent = column.cell ? column.cell(value, row) : value;

              return (
                <td
                  key={column.id}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-${
                    column.align || 'left'
                  } ${column.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                >
                  {cellContent}
                </td>
              );
            })}

            {/* Actions Column */}
            {config.showActions && config.renderActions && (
              <td
                className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {config.renderActions(row)}
              </td>
            )}
          </tr>
        );
      })}
    </tbody>
  );
}
