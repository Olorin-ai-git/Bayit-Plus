import React from 'react';
import { RAGToolPerformanceMetrics } from '../../../types/RAGTypes';

interface RAGToolPerformanceTrendsProps {
  selectedToolData: RAGToolPerformanceMetrics;
}

/**
 * RAG Tool Performance Trends Component
 * Shows trend analysis for selected tool
 */
const RAGToolPerformanceTrends: React.FC<RAGToolPerformanceTrendsProps> = ({
  selectedToolData,
}) => {
  const getToolIcon = (toolName: string) => {
    const toolIcons: Record<string, string> = {
      'splunk_search': '🔍',
      'risk_calculator': '📈',
      'device_analyzer': '📱',
      'geo_validator': '🌍',
      'fraud_detector': '🕵️',
      'network_analyzer': '🌐',
      'behavioral_model': '🧠',
      'identity_checker': '🆔',
    };
    return toolIcons[toolName.toLowerCase().replace(' ', '_')] || '🔧';
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getEffectivenessLevel = (effectiveness: number) => {
    if (effectiveness >= 0.8) return 'Excellent';
    if (effectiveness >= 0.6) return 'Good';
    if (effectiveness >= 0.4) return 'Fair';
    return 'Poor';
  };

  if (!selectedToolData.trendsData || selectedToolData.trendsData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📉</div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">No Trend Data Available</h4>
        <p className="text-sm text-gray-500">
          Trend data will appear as the tool is used over time.
        </p>
      </div>
    );
  }

  const recentTrends = selectedToolData.trendsData.slice(-20); // Last 20 data points
  const maxExecutionTime = Math.max(...recentTrends.map(t => t.executionTime));

  return (
    <div className="space-y-6">
      {/* Selected Tool Header */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-2xl">{getToolIcon(selectedToolData.toolName)}</span>
          <div>
            <h4 className="text-lg font-semibold text-blue-900">{selectedToolData.toolName}</h4>
            <p className="text-sm text-blue-700">Performance trends over time</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-blue-900">{selectedToolData.usageCount}</div>
            <div className="text-blue-700">Total Uses</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-900">{(selectedToolData.successRate * 100).toFixed(0)}%</div>
            <div className="text-blue-700">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-900">{formatDuration(selectedToolData.avgExecutionTime)}</div>
            <div className="text-blue-700">Avg Time</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-900">{selectedToolData.userSatisfaction.toFixed(1)}/5</div>
            <div className="text-blue-700">Satisfaction</div>
          </div>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-white border rounded-lg p-4">
        <h5 className="text-sm font-semibold text-gray-900 mb-4">Success Rate & Execution Time Trends</h5>
        <div className="space-y-2">
          {recentTrends.map((trend, index) => {
            const barWidth = (trend.executionTime / maxExecutionTime) * 100;
            const isSuccess = trend.successRate > 0;
            
            return (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-20 text-xs text-gray-500">
                  {new Date(trend.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex-1 relative">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full flex items-center px-1 ${
                        isSuccess ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(5, barWidth)}%` }}
                    >
                      {barWidth > 15 && (
                        <span className="text-xs text-white font-medium">
                          {formatDuration(trend.executionTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-12 text-xs text-center">
                  <span className={`px-1 py-0.5 rounded ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {isSuccess ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-green-800 mb-2">✅ Performance Highlights</h5>
          <ul className="text-xs text-green-700 space-y-1">
            <li>• Best execution time: {formatDuration(Math.min(...recentTrends.map(t => t.executionTime)))}</li>
            <li>• Success rate: {(selectedToolData.successRate * 100).toFixed(1)}% overall</li>
            <li>• Recent successes: {recentTrends.filter(t => t.successRate > 0).length}/{recentTrends.length}</li>
            <li>• User rating: {selectedToolData.userSatisfaction.toFixed(1)}/5 stars</li>
          </ul>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-yellow-800 mb-2">💡 Optimization Opportunities</h5>
          <ul className="text-xs text-yellow-700 space-y-1">
            {selectedToolData.avgExecutionTime > 3000 && (
              <li>• Consider optimizing execution time (currently {formatDuration(selectedToolData.avgExecutionTime)})</li>
            )}
            {selectedToolData.errorRate > 0.1 && (
              <li>• Error rate is high ({(selectedToolData.errorRate * 100).toFixed(1)}%) - investigate failures</li>
            )}
            {selectedToolData.userSatisfaction < 4.0 && (
              <li>• User satisfaction could be improved (currently {selectedToolData.userSatisfaction.toFixed(1)}/5)</li>
            )}
            {selectedToolData.usageCount < 10 && (
              <li>• Low usage count - consider promoting or improving accessibility</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RAGToolPerformanceTrends;