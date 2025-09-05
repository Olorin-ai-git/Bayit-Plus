import React from 'react';

interface SourceEffectivenessControlsProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filterBy: 'all' | 'high' | 'medium' | 'low';
  showInactive: boolean;
  onSortByChange: (sortBy: string) => void;
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
  onFilterByChange: (filterBy: 'all' | 'high' | 'medium' | 'low') => void;
  onShowInactiveChange: (showInactive: boolean) => void;
}

const SourceEffectivenessControls: React.FC<SourceEffectivenessControlsProps> = ({
  sortBy,
  sortOrder,
  filterBy,
  showInactive,
  onSortByChange,
  onSortOrderChange,
  onFilterByChange,
  onShowInactiveChange,
}) => {
  return (
    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select 
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="effectiveness">Effectiveness</option>
            <option value="usage">Usage Count</option>
            <option value="relevance">Relevance</option>
            <option value="freshness">Freshness</option>
          </select>
          <button
            onClick={() => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select 
            value={filterBy}
            onChange={(e) => onFilterByChange(e.target.value as any)}
            className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Sources</option>
            <option value="high">High Effectiveness</option>
            <option value="medium">Medium Effectiveness</option>
            <option value="low">Low Effectiveness</option>
          </select>
        </div>
        
        <label className="flex items-center text-sm text-gray-600">
          <input 
            type="checkbox" 
            checked={showInactive}
            onChange={(e) => onShowInactiveChange(e.target.checked)}
            className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Show Inactive
        </label>
      </div>
    </div>
  );
};

export default SourceEffectivenessControls;