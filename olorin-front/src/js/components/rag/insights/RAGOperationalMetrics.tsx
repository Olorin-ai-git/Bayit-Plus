import React, { useState, useEffect } from 'react';
import { RAGMetrics, RAGOperationalMetricsProps } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

/**
 * RAG Operational Metrics Component
 * Displays live operational data and system health metrics
 */
const RAGOperationalMetrics: React.FC<RAGOperationalMetricsProps> = ({
  metrics,
  investigationId,
  showDetails = false,
  refreshInterval = 5000,
}) => {
  const [liveMetrics, setLiveMetrics] = useState<RAGMetrics>(metrics);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onPerformanceUpdate: (data) => {
      setLiveMetrics(data.metrics);
      setLastUpdate(new Date());
      setIsLoading(false);
    },
    onConnectionChange: (connected) => {
      if (connected) {
        setIsLoading(true);
      }
    },
  });

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600 bg-green-100';
    if (value >= thresholds.warning) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const operationalData = [
    {
      label: 'Query Success Rate',
      value: liveMetrics.querySuccessRate,
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      thresholds: { good: 0.95, warning: 0.85 },
      icon: '✅',
    },
    {
      label: 'Average Response Time',
      value: liveMetrics.averageResponseTime,
      format: formatDuration,
      thresholds: { good: 2000, warning: 5000 },
      icon: '⚡',
      invert: true, // Lower is better
    },
    {
      label: 'Knowledge Base Hit Rate',
      value: liveMetrics.knowledgeBaseHitRate,
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      thresholds: { good: 0.8, warning: 0.6 },
      icon: '🎯',
    },
    {
      label: 'Active Sources',
      value: liveMetrics.activeSources,
      format: (v: number) => v.toString(),
      thresholds: { good: 5, warning: 2 },
      icon: '📚',
    },
    {
      label: 'Error Rate',
      value: liveMetrics.errorRate,
      format: (v: number) => `${(v * 100).toFixed(2)}%`,
      thresholds: { good: 0.05, warning: 0.1 },
      icon: '🚨',
      invert: true, // Lower is better
    },
    {
      label: 'System Load',
      value: liveMetrics.systemLoad,
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
      thresholds: { good: 0.7, warning: 0.85 },
      icon: '💾',
      invert: true, // Lower is better
    },
  ];

  const getMetricStatusColor = (metric: typeof operationalData[0]) => {
    const { value, thresholds, invert } = metric;
    if (value === undefined) return 'text-gray-600 bg-gray-100';
    
    if (invert) {
      if (value <= thresholds.good) return 'text-green-600 bg-green-100';
      if (value <= thresholds.warning) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    }
    return getStatusColor(value, thresholds);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Operational Metrics</h3>
          <p className="text-sm text-gray-500">
            Live system performance • Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          {isLoading && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {operationalData.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{metric.icon}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                getMetricStatusColor(metric)
              }`}>
                {metric.value !== undefined ? metric.format(metric.value) : 'N/A'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{metric.label}</p>
              {showDetails && (
                <p className="text-xs text-gray-500 mt-1">
                  Target: {metric.invert ? '≤' : '≥'} {metric.format(metric.thresholds.good)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* System Health Summary */}
      {showDetails && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">System Health Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-blue-900 mb-2">📊 Performance Insights</h5>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Query processing: {(liveMetrics.querySuccessRate ?? 0) >= 0.95 ? 'Optimal' : 'Needs attention'}</li>
                <li>• Response times: {(liveMetrics.averageResponseTime ?? 0) <= 2000 ? 'Excellent' : 'Monitor closely'}</li>
                <li>• Knowledge utilization: {(liveMetrics.knowledgeBaseHitRate ?? 0) >= 0.8 ? 'High' : 'Improving'}</li>
              </ul>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-purple-900 mb-2">🔧 System Status</h5>
              <ul className="text-xs text-purple-800 space-y-1">
                <li>• Error handling: {(liveMetrics.errorRate ?? 0) <= 0.05 ? 'Stable' : 'Review needed'}</li>
                <li>• Resource usage: {(liveMetrics.systemLoad ?? 0) <= 0.7 ? 'Normal' : 'High'}</li>
                <li>• Data sources: {liveMetrics.activeSources ?? 0} sources active</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGOperationalMetrics;