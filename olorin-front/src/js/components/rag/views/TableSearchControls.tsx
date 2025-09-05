import React from 'react';

interface TableSearchControlsProps {
  searchTerm: string;
  onSearch: (value: string) => void;
  resultCount: number;
  totalCount: number;
}

const TableSearchControls: React.FC<TableSearchControlsProps> = ({
  searchTerm,
  onSearch,
  resultCount,
  totalCount,
}) => {
  return (
    <div className="flex items-center gap-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Search all columns..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Results Info */}
      <div className="text-sm text-gray-600">
        Showing {resultCount} of {totalCount} records
      </div>
    </div>
  );
};

export default TableSearchControls;