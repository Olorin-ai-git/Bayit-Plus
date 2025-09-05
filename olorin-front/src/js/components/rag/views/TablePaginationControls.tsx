import React from 'react';

interface TablePaginationControlsProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

const TablePaginationControls: React.FC<TablePaginationControlsProps> = ({
  pageSize,
  onPageSizeChange,
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Rows per page:</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="min-w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
      >
        {[5, 10, 25, 50, 100].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TablePaginationControls;