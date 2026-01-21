/**
 * Table Pagination Component
 *
 * Renders pagination controls for the table.
 *
 * @module shared/components/Table/TablePagination
 */

import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { TablePagination } from './types';

// ============================================================================
// Component Props
// ============================================================================

interface TablePaginationControlsProps {
  pagination: TablePagination;
  className?: string;
}

// ============================================================================
// Component Implementation
// ============================================================================

export function TablePaginationControls({
  pagination,
  className = ''
}: TablePaginationControlsProps) {
  const { currentPage, totalPages, totalRows, pageSize, goToPage, goToNextPage, goToPreviousPage, setPageSize } =
    pagination;

  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRows);

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Results Summary */}
      <div className="text-sm text-gray-400">
        Showing <span className="font-medium text-gray-300">{startRow}</span> to{' '}
        <span className="font-medium text-gray-300">{endRow}</span> of{' '}
        <span className="font-medium text-gray-300">{totalRows}</span> results
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={goToPreviousPage}
          disabled={currentPage === 1}
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum, idx) => {
            if (pageNum === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">
                  ...
                </span>
              );
            }

            const page = pageNum as number;
            return (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>

        {/* Page Size Selector */}
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="ml-4 px-3 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [1];

  if (currentPage > 3) {
    pages.push('...');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('...');
  }

  pages.push(totalPages);

  return pages;
}
