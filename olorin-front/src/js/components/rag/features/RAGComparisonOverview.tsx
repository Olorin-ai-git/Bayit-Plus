import React from 'react';
import { RAGComparisonData } from '../../../types/RAGTypes';

interface RAGComparisonOverviewProps {
  comparisons: RAGComparisonData[];
  selectedComparisonId: string;
  onComparisonSelect: (comparison: RAGComparisonData) => void;
}

/**
 * RAG Comparison Overview Component
 * Grid view of all comparisons with key metrics
 */
const RAGComparisonOverview: React.FC<RAGComparisonOverviewProps> = ({
  comparisons,
  selectedComparisonId,
  onComparisonSelect,
}) => {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {comparisons.map((comparison) => {
        const isSelected = comparison.id === selectedComparisonId;
        
        return (
          <div 
            key={comparison.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            onClick={() => onComparisonSelect(comparison)}
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

export default RAGComparisonOverview;
