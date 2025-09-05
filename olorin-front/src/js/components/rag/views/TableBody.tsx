import React from 'react';
import { ColumnDefinition } from '../../../types/EnhancedChatMessage';

interface TableBodyProps {
  data: any[];
  columns: ColumnDefinition[];
}

const TableBody: React.FC<TableBodyProps> = ({ data, columns }) => {
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
      <tbody>
        <tr>
          <td
            colSpan={columns.length}
            className="px-6 py-8 text-center text-gray-500"
          >
            <div className="flex flex-col items-center">
              <svg
                className="h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>No data available</span>
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {data.map((row, index) => (
        <tr key={index} className="hover:bg-gray-50">
          {columns.map((column) => (
            <td
              key={column.key}
              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
            >
              {formatCellValue(row[column.key], column)}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
};

export default TableBody;