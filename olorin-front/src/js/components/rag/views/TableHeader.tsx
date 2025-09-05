import React from 'react';
import { ColumnDefinition, SortCriteria } from '../../../types/EnhancedChatMessage';

interface TableHeaderProps {
  columns: ColumnDefinition[];
  sortCriteria: SortCriteria | null;
  onSort: (column: string) => void;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  columns,
  sortCriteria,
  onSort,
}) => {
  const getSortIcon = (column: string) => {
    if (!sortCriteria || sortCriteria.column !== column) {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortCriteria.direction === 'asc' ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <thead>
      <tr className="bg-gray-50">
        {columns.map((column) => (
          <th
            key={column.key}
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-semibold text-gray-900 bg-gray-50 border-b-2 border-gray-200"
          >
            <div className="flex items-center gap-2">
              <span>{column.label}</span>
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
  );
};

export default TableHeader;