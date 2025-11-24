import React, { useState, useMemo } from 'react';
import {
  AgentMetrics,
  AgentPerformanceData,
  AnalyticsFilter
} from '../types/agentAnalytics';

interface PerformanceMetricsProps {
  agent: AgentMetrics;
  performanceHistory: AgentPerformanceData[];
  onFilterChange?: (filter: Partial<AnalyticsFilter>) => void;
  isLoading?: boolean;
  className?: string;
}

interface MetricCard {
  title: string;
  value: number;
  unit: string;
  trend: number;
  icon: string;
  color: string;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  agent,
  performanceHistory,
  onFilterChange,
  isLoading = false,
  className = ''
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [showDetails, setShowDetails] = useState(false);

  // Calculate performance metrics
  const metrics = useMemo((): MetricCard[] => {
    const { performance, trends } = agent;

    return [
      {
        title: 'Success Rate',
        value: performance.successRate,
        unit: '%',
        trend: trends.performanceTrend,
        icon: '✓',
        color: performance.successRate >= 90 ? 'text-green-600' :
               performance.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'
      },
      {
        title: 'Avg Completion Time',
        value: performance.averageCompletionTime,
        unit: 'min',
        trend: -trends.performanceTrend, // Lower is better for time
        icon: '⏱',
        color: performance.averageCompletionTime <= 30 ? 'text-green-600' :
               performance.averageCompletionTime <= 60 ? 'text-yellow-600' : 'text-red-600'
      },
      {
        title: 'Accuracy Score',
        value: performance.averageAccuracy,
        unit: '%',
        trend: trends.qualityTrend,
        icon: '🎯',
        color: performance.averageAccuracy >= 85 ? 'text-green-600' :
               performance.averageAccuracy >= 70 ? 'text-yellow-600' : 'text-red-600'
      },
      {
        title: 'Error Rate',
        value: performance.errorRate,
        unit: '%',
        trend: -trends.performanceTrend, // Lower is better for errors
        icon: '⚠',
        color: performance.errorRate <= 5 ? 'text-green-600' :
               performance.errorRate <= 15 ? 'text-yellow-600' : 'text-red-600'
      }
    ];
  }, [agent]);

  // Filter performance history based on selected period
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date(now);

    switch (selectedPeriod) {
      case 'hour':
        cutoffDate.setHours(now.getHours() - 24);
        break;
      case 'day':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'week':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
    }

    return performanceHistory.filter(entry =>
      new Date(entry.timestamp) >= cutoffDate
    );
  }, [performanceHistory, selectedPeriod]);

  // Calculate performance statistics
  const stats = useMemo(() => {
    if (filteredHistory.length === 0) {
      return {
        averageSuccessRate: 0,
        averageCompletionTime: 0,
        totalCalls: 0,
        averageAccuracy: 0,
        peakPerformanceTime: 'N/A'
      };
    }

    const totalCalls = filteredHistory.reduce((sum, entry) => sum + entry.callCount, 0);
    const averageSuccessRate = filteredHistory.reduce((sum, entry) =>
      sum + entry.successRate, 0) / filteredHistory.length;
    const averageCompletionTime = filteredHistory.reduce((sum, entry) =>
      sum + entry.completionTime, 0) / filteredHistory.length;
    const averageAccuracy = filteredHistory.reduce((sum, entry) =>
      sum + entry.accuracy, 0) / filteredHistory.length;

    // Find peak performance time
<<<<<<< HEAD
    const bestPerformance = filteredHistory.reduce((best, entry) =>
      entry.successRate > best.successRate ? entry : best, filteredHistory[0]);
=======
    const firstEntry = filteredHistory[0];
    if (!firstEntry) {
      return {
        averageSuccessRate: 0,
        averageCompletionTime: 0,
        averageAccuracy: 0,
        peakPerformanceTime: 'N/A',
        performanceTrend: 'stable' as const
      };
    }

    const bestPerformance = filteredHistory.reduce((best, entry) =>
      entry.successRate > best.successRate ? entry : best, firstEntry);
>>>>>>> 001-modify-analyzer-method

    const peakPerformanceTime = new Date(bestPerformance.timestamp).toLocaleString();

    return {
      averageSuccessRate,
      averageCompletionTime,
      totalCalls,
      averageAccuracy,
      peakPerformanceTime
    };
  }, [filteredHistory]);

  const handlePeriodChange = (period: 'hour' | 'day' | 'week' | 'month') => {
    setSelectedPeriod(period);
    onFilterChange?.({ granularity: period });
  };

  const renderTrendIcon = (trend: number) => {
    if (trend > 0) return <span className="text-green-500">↗ +{trend.toFixed(1)}%</span>;
    if (trend < 0) return <span className="text-red-500">↘ {trend.toFixed(1)}%</span>;
    return <span className="text-gray-500">→ 0%</span>;
  };

  const renderMetricCard = (metric: MetricCard) => (
    <div key={metric.title} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className="text-2xl mr-2">{metric.icon}</span>
          <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
        </div>
        {renderTrendIcon(metric.trend)}
      </div>
      <div className="flex items-baseline">
        <span className={`text-3xl font-bold ${metric.color}`}>
          {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
        </span>
        <span className="text-lg text-gray-500 ml-1">{metric.unit}</span>
      </div>
    </div>
  );

  const renderPerformanceChart = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Performance Trend</h3>
        <div className="flex space-x-2">
          {(['hour', 'day', 'week', 'month'] as const).map(period => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredHistory.length > 0 ? (
        <div className="space-y-4">
          {/* Simple text-based chart representation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Success Rate Over Time</h4>
              <div className="space-y-2">
                {filteredHistory.slice(-5).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${entry.successRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{entry.successRate.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Call Volume</h4>
              <div className="space-y-2">
                {filteredHistory.slice(-5).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-medium">{entry.callCount} calls</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No performance data available for the selected period</p>
        </div>
      )}
    </div>
  );

  const renderDetailedStats = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Statistics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-600">Total Investigations</p>
          <p className="text-xl font-semibold text-gray-900">
            {agent.performance.totalInvestigations.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Completed Investigations</p>
          <p className="text-xl font-semibold text-gray-900">
            {agent.performance.completedInvestigations.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Calls ({selectedPeriod})</p>
          <p className="text-xl font-semibold text-gray-900">
            {stats.totalCalls.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Avg Success Rate</p>
          <p className="text-xl font-semibold text-gray-900">
            {stats.averageSuccessRate.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Avg Completion Time</p>
          <p className="text-xl font-semibold text-gray-900">
            {stats.averageCompletionTime.toFixed(1)} min
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Peak Performance</p>
          <p className="text-sm font-medium text-gray-900">
            {stats.peakPerformanceTime}
          </p>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32" />
          ))}
        </div>
        <div className="bg-gray-200 rounded-lg h-64" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Agent Info Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{agent.agentName}</h2>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                agent.status === 'active' ? 'bg-green-100 text-green-800' :
                agent.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                agent.status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                Type: {agent.agentType}
              </span>
              <span className="text-sm text-gray-500">
                Last Activity: {new Date(agent.performance.lastActivity).toLocaleString()}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {/* Performance Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map(renderMetricCard)}
      </div>

      {/* Performance Chart */}
      {renderPerformanceChart()}

      {/* Detailed Statistics */}
      {showDetails && renderDetailedStats()}
    </div>
  );
};

export default PerformanceMetrics;