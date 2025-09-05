import React, { useState, useMemo } from 'react';
import { RAGComparisonViewProps, RAGComparisonData } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

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

  const getComparisonTypeIcon = (type: RAGComparisonData['type']) => {
    const icons = {
      'before_after': '⏮️',
      'a_b_test': '🅰️',
      'benchmark': '🎯',
      'historical': '📅',
    };
    return icons[type] || '📈';
  };

  const getComparisonTypeLabel = (type: RAGComparisonData['type']) => {
    const labels = {
      'before_after': 'Before/After',
      'a_b_test': 'A/B Test',
      'benchmark': 'Benchmark',
      'historical': 'Historical',
    };
    return labels[type] || type;
  };

  const getImprovementColor = (improvement: number) => {
    if (improvement >= 20) return 'text-green-600 bg-green-100';
    if (improvement >= 10) return 'text-blue-600 bg-blue-100';
    if (improvement >= 0) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatMetricValue = (key: string, value: any) => {
    if (key.includes('rate') || key.includes('success')) {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (key.includes('time')) {
      return `${value}ms`;
    }
    if (key.includes('queries') || key.includes('chunks')) {
      return value.toString();
    }
    return value.toString();
  };

  const calculateMetricImprovement = (baseline: number, comparison: number, metricKey: string) => {
    const isLowerBetter = metricKey.includes('time') || metricKey.includes('error');
    const improvement = isLowerBetter 
      ? ((baseline - comparison) / baseline) * 100
      : ((comparison - baseline) / baseline) * 100;
    return improvement;
  };

  const renderComparisonOverview = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedComparisons.map((comparison) => {
          const isSelected = comparison.id === selectedComparisonId;
          
          return (
            <div 
              key={comparison.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => handleComparisonSelect(comparison)}
            >
              {/* Comparison Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{getComparisonTypeIcon(comparison.type)}</span>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{comparison.name}</h4>
                    <p className="text-xs text-gray-500">{getComparisonTypeLabel(comparison.type)}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  getImprovementColor(comparison.improvementPercentage)
                }`}>
                  {comparison.improvementPercentage > 0 ? '+' : ''}{comparison.improvementPercentage.toFixed(1)}%
                </span>
              </div>

              {/* Key Improvements */}
              <div className="space-y-2 mb-3">
                {comparison.significantChanges.slice(0, 3).map((change, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 capitalize">
                      {change.metric.replace('_', ' ')}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className={`${
                        change.isImprovement ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {change.isImprovement ? '↑' : '↓'}
                      </span>
                      <span className="font-medium">
                        {change.change > 0 ? '+' : ''}{change.change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center bg-gray-50 rounded p-2">
                  <div className="font-bold text-gray-900">
                    {comparison.baselineMetrics.total_queries}
                  </div>
                  <div className="text-gray-500">Baseline Queries</div>
                </div>
                <div className="text-center bg-gray-50 rounded p-2">
                  <div className="font-bold text-gray-900">
                    {comparison.comparisonMetrics.total_queries}
                  </div>
                  <div className="text-gray-500">Comparison Queries</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetailedComparison = () => {
    if (!selectedComparisonData) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📈</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Comparison</h4>
          <p className="text-sm text-gray-500">
            Choose a comparison from the list to view detailed analysis.
          </p>
        </div>
      );
    }

    const { baselineMetrics, comparisonMetrics } = selectedComparisonData;
    const metricKeys = Object.keys(baselineMetrics).filter(key => key !== 'active_sources');

    return (
      <div className="space-y-6">
        {/* Comparison Header */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getComparisonTypeIcon(selectedComparisonData.type)}</span>
              <div>
                <h4 className="text-lg font-semibold text-blue-900">{selectedComparisonData.name}</h4>
                <p className="text-sm text-blue-700">
                  {getComparisonTypeLabel(selectedComparisonData.type)} Analysis
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold ${
                selectedComparisonData.improvementPercentage >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedComparisonData.improvementPercentage > 0 ? '+' : ''}
                {selectedComparisonData.improvementPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-blue-700">Overall Improvement</div>
            </div>
          </div>
        </div>

        {/* Metrics Comparison Table */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h5 className="text-sm font-semibold text-gray-900">Metrics Comparison</h5>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Metric</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Baseline</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Comparison</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Change</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metricKeys.map((metricKey) => {
                  const baselineValue = baselineMetrics[metricKey as keyof typeof baselineMetrics] as number;
                  const comparisonValue = comparisonMetrics[metricKey as keyof typeof comparisonMetrics] as number;
                  const improvement = calculateMetricImprovement(baselineValue, comparisonValue, metricKey);
                  const isImprovement = improvement > 0;
                  
                  return (
                    <tr key={metricKey} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                        {metricKey.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">
                        {formatMetricValue(metricKey, baselineValue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">
                        {formatMetricValue(metricKey, comparisonValue)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-center font-medium ${
                        isImprovement ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <div className="flex items-center justify-center space-x-1">
                          <span>{isImprovement ? '↑' : '↓'}</span>
                          <span>{improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          Math.abs(improvement) >= 20 ? 'bg-green-100 text-green-800' :
                          Math.abs(improvement) >= 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {Math.abs(improvement) >= 20 ? 'High' :
                           Math.abs(improvement) >= 10 ? 'Medium' : 'Low'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Significant Changes */}
        <div className="bg-white border rounded-lg p-6">
          <h5 className="text-sm font-semibold text-gray-900 mb-4">Significant Changes</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <h6 className="text-sm font-semibold text-green-800 mb-2">↑ Improvements</h6>
              <div className="space-y-2">
                {selectedComparisonData.significantChanges
                  .filter(change => change.isImprovement)
                  .map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-green-700 capitalize">
                        {change.metric.replace('_', ' ')}
                      </span>
                      <span className="font-medium text-green-900">
                        +{change.change.toFixed(1)}%
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <h6 className="text-sm font-semibold text-red-800 mb-2">↓ Degradations</h6>
              <div className="space-y-2">
                {selectedComparisonData.significantChanges
                  .filter(change => !change.isImprovement)
                  .map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-red-700 capitalize">
                        {change.metric.replace('_', ' ')}
                      </span>
                      <span className="font-medium text-red-900">
                        {change.change.toFixed(1)}%
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="bg-purple-50 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-purple-800 mb-3">📊 Analysis Summary</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-purple-900">
                {selectedComparisonData.significantChanges.filter(c => c.isImprovement).length}
              </div>
              <div className="text-purple-700">Improvements</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-900">
                {selectedComparisonData.significantChanges.filter(c => !c.isImprovement).length}
              </div>
              <div className="text-purple-700">Degradations</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-900">
                {selectedComparisonData.improvementPercentage.toFixed(1)}%
              </div>
              <div className="text-purple-700">Net Improvement</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-900">
                {selectedComparisonData.significantChanges.length}
              </div>
              <div className="text-purple-700">Total Changes</div>
            </div>
          </div>
        </div>
      </div>
    );
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
            {viewMode === 'overview' && renderComparisonOverview()}
            {viewMode === 'detailed' && renderDetailedComparison()}
            {viewMode === 'side-by-side' && renderDetailedComparison()} {/* Could be enhanced for true side-by-side */}
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