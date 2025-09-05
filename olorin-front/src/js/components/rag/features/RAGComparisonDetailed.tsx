import React from 'react';
import { RAGComparisonData } from '../../../types/RAGTypes';

interface RAGComparisonDetailedProps {
  selectedComparisonData: RAGComparisonData | undefined;
}

/**
 * RAG Comparison Detailed Component
 * Detailed metrics analysis for selected comparison
 */
const RAGComparisonDetailed: React.FC<RAGComparisonDetailedProps> = ({
  selectedComparisonData,
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

export default RAGComparisonDetailed;
