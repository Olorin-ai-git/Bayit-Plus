import React from 'react';
import { ColumnDefinition, SortCriteria } from '../../../types/EnhancedChatMessage';

interface TableDataGridProps {
  columns: ColumnDefinition[];
  data: any[];
  sortCriteria: SortCriteria | null;
  onSort: (column: string) => void;
}

const TableDataGrid: React.FC<TableDataGridProps> = ({
  columns,
  data,
  sortCriteria,
  onSort,
}) => {
  const getSortIcon = (column: string) => {
    if (sortCriteria?.column !== column) {
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortCriteria.direction === 'asc' ? (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{column.label}</span>
                  {column.sortable && (
                    <button
                      onClick={() => onSort(column.key)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {getSortIcon(column.key)}
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr
              key={index}
              className="hover:bg-gray-50 transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-800"
                >
                  <div className="max-w-xs">
                    <span
                      className="block truncate"
                      title={String(row[column.key])}
                    >
                      {formatCellValue(row[column.key], column)}
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableDataGrid;