import React from 'react';
import { RAGToolPerformanceMetrics } from '../../../types/RAGTypes';

interface RAGToolPerformanceDetailedProps {
  selectedToolData: RAGToolPerformanceMetrics | undefined;
}

/**
 * RAG Tool Performance Detailed Component
 * Detailed metrics view for selected tool
 */
const RAGToolPerformanceDetailed: React.FC<RAGToolPerformanceDetailedProps> = ({
  selectedToolData,
}) => {
  const getPerformanceColor = (score: number, type: 'success' | 'time' | 'error' | 'satisfaction') => {
    switch (type) {
      case 'success':
        if (score >= 0.9) return 'text-green-600 bg-green-100';
        if (score >= 0.7) return 'text-blue-600 bg-blue-100';
        if (score >= 0.5) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
      case 'time':
        if (score <= 1000) return 'text-green-600 bg-green-100';
        if (score <= 3000) return 'text-blue-600 bg-blue-100';
        if (score <= 5000) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
      case 'error':
        if (score <= 0.05) return 'text-green-600 bg-green-100';
        if (score <= 0.1) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
      case 'satisfaction':
        if (score >= 4.5) return 'text-green-600 bg-green-100';
        if (score >= 3.5) return 'text-blue-600 bg-blue-100';
        if (score >= 2.5) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (!selectedToolData) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔍</div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Tool</h4>
        <p className="text-sm text-gray-500">
          Choose a tool from the list to view detailed performance analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`border rounded-lg p-4 ${
          getPerformanceColor(selectedToolData.successRate, 'success').includes('green') ? 'bg-green-50 border-green-200' : 'bg-white'
        }`}>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {(selectedToolData.successRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Success Rate</div>
            <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
              getPerformanceColor(selectedToolData.successRate, 'success')
            }`}>
              {selectedToolData.successRate >= 0.9 ? 'Excellent' :
               selectedToolData.successRate >= 0.7 ? 'Good' :
               selectedToolData.successRate >= 0.5 ? 'Fair' : 'Poor'}
            </div>
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          selectedToolData.avgExecutionTime <= 1000 ? 'bg-green-50 border-green-200' : 'bg-white'
        }`}>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatDuration(selectedToolData.avgExecutionTime)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Avg Execution Time</div>
            <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
              getPerformanceColor(selectedToolData.avgExecutionTime, 'time')
            }`}>
              {selectedToolData.avgExecutionTime <= 1000 ? 'Fast' :
               selectedToolData.avgExecutionTime <= 3000 ? 'Moderate' :
               selectedToolData.avgExecutionTime <= 5000 ? 'Slow' : 'Very Slow'}
            </div>
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          selectedToolData.errorRate <= 0.05 ? 'bg-green-50 border-green-200' : 'bg-white'
        }`}>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {(selectedToolData.errorRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Error Rate</div>
            <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
              getPerformanceColor(selectedToolData.errorRate, 'error')
            }`}>
              {selectedToolData.errorRate <= 0.05 ? 'Excellent' :
               selectedToolData.errorRate <= 0.1 ? 'Good' : 'Needs Attention'}
            </div>
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          selectedToolData.userSatisfaction >= 4.5 ? 'bg-green-50 border-green-200' : 'bg-white'
        }`}>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {selectedToolData.userSatisfaction.toFixed(1)}/5
            </div>
            <div className="text-sm text-gray-600 mt-1">User Satisfaction</div>
            <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
              getPerformanceColor(selectedToolData.userSatisfaction, 'satisfaction')
            }`}>
              {selectedToolData.userSatisfaction >= 4.5 ? 'Excellent' :
               selectedToolData.userSatisfaction >= 3.5 ? 'Good' :
               selectedToolData.userSatisfaction >= 2.5 ? 'Fair' : 'Poor'}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-blue-800 mb-3">Usage Statistics</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-blue-900">{selectedToolData.usageCount}</div>
            <div className="text-blue-700">Total Executions</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-900">
              {Math.round(selectedToolData.usageCount * selectedToolData.successRate)}
            </div>
            <div className="text-blue-700">Successful Runs</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-900">
              {Math.round(selectedToolData.usageCount * selectedToolData.errorRate)}
            </div>
            <div className="text-blue-700">Failed Runs</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-900">
              {selectedToolData.trendsData.length}
            </div>
            <div className="text-blue-700">Data Points</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGToolPerformanceDetailed;
