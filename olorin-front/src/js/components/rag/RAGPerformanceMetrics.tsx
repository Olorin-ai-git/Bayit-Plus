import React from 'react';
import { RAGPerformanceMetricsProps, RAGMetrics } from '../../types/RAGTypes';

/**
 * RAG Performance Metrics Component
 * Displays real-time performance metrics for RAG operations
 */
const RAGPerformanceMetrics: React.FC<RAGPerformanceMetricsProps> = ({
  metrics,
  realTime = true,
  compact = false,
  className = '',
}) => {
  // Format time values
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Get performance status color
  const getPerformanceColor = (value: number, type: 'time' | 'rate'): string => {
    if (type === 'time') {
      // Lower is better for time metrics
      if (value < 200) return 'text-green-600';
      if (value < 500) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      // Higher is better for rate metrics  
      if (value >= 0.8) return 'text-green-600';
      if (value >= 0.6) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  // Metric item component
  const MetricItem: React.FC<{
    label: string;
    value: string;
    color?: string;
    icon: React.ReactNode;
    subtitle?: string;
  }> = ({ label, value, color = 'text-gray-900', icon, subtitle }) => (
    <div className={`flex items-center space-x-3 ${compact ? 'py-1' : 'py-2'}`}>
      <div className="flex-shrink-0 text-gray-500">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${compact ? 'font-medium' : 'font-semibold'} text-gray-700`}>
            {label}
          </span>
          <span className={`text-sm font-bold ${color}`}>
            {value}
          </span>
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-1">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-1">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>RAG Metrics</span>
          </h4>
          {realTime && (
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className={`text-lg font-bold ${getPerformanceColor(metrics.avg_retrieval_time, 'time')}`}>
              {formatTime(metrics.avg_retrieval_time)}
            </div>
            <div className="text-xs text-gray-500">Avg Time</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getPerformanceColor(metrics.knowledge_hit_rate, 'rate')}`}>
              {formatPercentage(metrics.knowledge_hit_rate)}
            </div>
            <div className="text-xs text-gray-500">Hit Rate</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>RAG Performance Metrics</span>
        </h3>
        {realTime && (
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Real-time</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <MetricItem
          label="Total Queries"
          value={metrics.total_queries.toString()}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />

        <MetricItem
          label="Average Retrieval Time"
          value={formatTime(metrics.avg_retrieval_time)}
          color={getPerformanceColor(metrics.avg_retrieval_time, 'time')}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <MetricItem
          label="Knowledge Hit Rate"
          value={formatPercentage(metrics.knowledge_hit_rate)}
          color={getPerformanceColor(metrics.knowledge_hit_rate, 'rate')}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <MetricItem
          label="Enhancement Success Rate"
          value={formatPercentage(metrics.enhancement_success_rate)}
          color={getPerformanceColor(metrics.enhancement_success_rate, 'rate')}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />

        <MetricItem
          label="Knowledge Chunks Used"
          value={metrics.total_knowledge_chunks.toString()}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />

        {metrics.active_sources.length > 0 && (
          <MetricItem
            label="Active Sources"
            value={metrics.active_sources.length.toString()}
            subtitle={metrics.active_sources.slice(0, 2).join(', ') + 
              (metrics.active_sources.length > 2 ? ` +${metrics.active_sources.length - 2} more` : '')}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
};

export default RAGPerformanceMetrics;
