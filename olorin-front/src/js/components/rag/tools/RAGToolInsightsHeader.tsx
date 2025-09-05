import React from 'react';

interface RAGToolInsightsHeaderProps {
  insightsCount: number;
  sortBy: 'confidence' | 'effectiveness' | 'recent';
  onSortChange: (sortBy: 'confidence' | 'effectiveness' | 'recent') => void;
  isConnected: boolean;
}

/**
 * Header component for RAG Tool Insights with controls and status
 */
const RAGToolInsightsHeader: React.FC<RAGToolInsightsHeaderProps> = ({
  insightsCount,
  sortBy,
  onSortChange,
  isConnected,
}) => {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tool Insights</h3>
          <p className="text-sm text-gray-500">
            {insightsCount} tool recommendations • Context-aware suggestions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="confidence">By Confidence</option>
            <option value="effectiveness">By Effectiveness</option>
            <option value="recent">Most Recent</option>
          </select>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span>{isConnected ? 'Live' : 'Static'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGToolInsightsHeader;