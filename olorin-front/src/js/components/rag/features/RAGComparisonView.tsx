import React, { useState, useMemo } from 'react';
import { RAGComparisonViewProps, RAGComparisonData } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';
import RAGComparisonOverview from './RAGComparisonOverview';
import RAGComparisonDetailed from './RAGComparisonDetailed';

/**
 * RAG Comparison View Component
 * Before/after RAG comparisons and A/B testing results
 */
const RAGComparisonView: React.FC<RAGComparisonViewProps> = ({
  investigationId,
  comparisons = [],
  selectedComparison,
  onComparisonSelect,
}) => {
  const [liveComparisons, setLiveComparisons] = useState<RAGComparisonData[]>(comparisons);
  const [selectedComparisonId, setSelectedComparisonId] = useState<string>(selectedComparison || comparisons[0]?.id || '');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'side-by-side'>('overview');
  const [sortBy, setSortBy] = useState<'improvement' | 'recent' | 'name'>('improvement');

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onComparisonUpdate: (data) => {
      if (data.comparisons) {
        setLiveComparisons(data.comparisons);
      }
    },
  });

  const selectedComparisonData = liveComparisons.find(c => c.id === selectedComparisonId);

  const sortedComparisons = useMemo(() => {
    return [...liveComparisons].sort((a, b) => {
      switch (sortBy) {
        case 'improvement':
          return b.improvementPercentage - a.improvementPercentage;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          return b.id.localeCompare(a.id); // Assuming newer IDs are lexicographically larger
      }
    });
  }, [liveComparisons, sortBy]);

  const handleComparisonSelect = (comparison: RAGComparisonData) => {
    setSelectedComparisonId(comparison.id);
    onComparisonSelect?.(comparison);
  };



  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">RAG Comparisons</h3>
            <p className="text-sm text-gray-500">
              {liveComparisons.length} comparisons • Performance analysis and A/B testing
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="improvement">By Improvement</option>
              <option value="recent">Most Recent</option>
              <option value="name">By Name</option>
            </select>
            <div className="flex items-center space-x-1 border rounded-md">
              {['overview', 'detailed', 'side-by-side'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === mode 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {mode === 'overview' && '📊'}
                  {mode === 'detailed' && '🔍'}
                  {mode === 'side-by-side' && '🔄'}
                  <span className="ml-1 capitalize">{mode.replace('-', ' ')}</span>
                </button>
              ))}
            </div>
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

      {/* Content */}
      <div className="p-6">
        {liveComparisons.length > 0 ? (
          <div>
            {viewMode === 'overview' && (
              <RAGComparisonOverview 
                comparisons={sortedComparisons}
                selectedComparisonId={selectedComparisonId}
                onComparisonSelect={handleComparisonSelect}
              />
            )}
            {(viewMode === 'detailed' || viewMode === 'side-by-side') && (
              <RAGComparisonDetailed selectedComparisonData={selectedComparisonData} />
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔄</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Comparisons Available</h4>
            <p className="text-sm text-gray-500">
              RAG performance comparisons and A/B test results will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      {liveComparisons.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{liveComparisons.length}</div>
              <div className="text-xs text-gray-500">Total Comparisons</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {liveComparisons.filter(c => c.improvementPercentage > 0).length}
              </div>
              <div className="text-xs text-gray-500">Showing Improvements</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {(liveComparisons.reduce((sum, c) => sum + c.improvementPercentage, 0) / liveComparisons.length).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Avg Improvement</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {Math.max(...liveComparisons.map(c => c.improvementPercentage)).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Best Improvement</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGComparisonView;