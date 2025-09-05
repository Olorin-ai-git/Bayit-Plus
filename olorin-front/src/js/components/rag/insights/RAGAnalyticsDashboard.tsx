import React from 'react';
import { RAGInsight, RAGMetrics } from '../../../types/RAGTypes';

interface RAGAnalyticsDashboardProps {
  metrics: RAGMetrics;
  insights: RAGInsight[];
  investigationId: string;
}

/**
 * RAG Analytics Dashboard Component
 * Key performance indicators and success metrics for RAG system
 */
const RAGAnalyticsDashboard: React.FC<RAGAnalyticsDashboardProps> = ({
  metrics,
  insights,
  investigationId,
}) => {
  // Calculate derived metrics
  const successfulInsights = insights.filter(i => i.confidence > 0.7).length;
  const avgConfidence = insights.length > 0 
    ? insights.reduce((acc, i) => acc + i.confidence, 0) / insights.length 
    : 0;
  const uniqueAgents = new Set(insights.map(i => i.agent)).size;
  const recentInsights = insights.filter(
    i => new Date(i.timestamp) > new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
  ).length;

  const kpis = [
    {
      title: 'Total Queries',
      value: metrics.total_queries.toLocaleString(),
      change: '+12%',
      trend: 'up',
      icon: '🔍',
    },
    {
      title: 'Avg Retrieval Time',
      value: `${metrics.avg_retrieval_time}ms`,
      change: '-8%',
      trend: 'down',
      icon: '⚡',
    },
    {
      title: 'Knowledge Hit Rate',
      value: `${(metrics.knowledge_hit_rate * 100).toFixed(1)}%`,
      change: '+5%',
      trend: 'up',
      icon: '🎯',
    },
    {
      title: 'Enhancement Success',
      value: `${(metrics.enhancement_success_rate * 100).toFixed(1)}%`,
      change: '+3%',
      trend: 'up',
      icon: '✨',
    },
    {
      title: 'Active Sources',
      value: metrics.active_sources.length.toString(),
      change: '+2',
      trend: 'up',
      icon: '📚',
    },
    {
      title: 'Avg Confidence',
      value: `${(avgConfidence * 100).toFixed(1)}%`,
      change: `${successfulInsights}/${insights.length} high`,
      trend: 'neutral',
      icon: '📊',
    },
  ];

  const activityMetrics = [
    {
      label: 'Recent Insights (30m)',
      value: recentInsights,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      label: 'Active Agents',
      value: uniqueAgents,
      color: 'bg-green-100 text-green-800',
    },
    {
      label: 'Knowledge Chunks',
      value: metrics.total_knowledge_chunks,
      color: 'bg-purple-100 text-purple-800',
    },
    {
      label: 'High Confidence',
      value: successfulInsights,
      color: 'bg-indigo-100 text-indigo-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{kpi.icon}</span>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {kpi.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {kpi.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        kpi.trend === 'up' ? 'text-green-600' :
                        kpi.trend === 'down' ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {kpi.trend === 'up' && (
                          <svg className="self-center flex-shrink-0 h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {kpi.trend === 'down' && (
                          <svg className="self-center flex-shrink-0 h-3 w-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="sr-only">{kpi.trend === 'up' ? 'Increased' : kpi.trend === 'down' ? 'Decreased' : 'No change'} by</span>
                        {kpi.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Summary */}
      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Activity Summary</h4>
          <p className="text-sm text-gray-500">Real-time RAG system activity metrics</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {activityMetrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${metric.color}`}>
                  {metric.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Sources */}
      {metrics.active_sources.length > 0 && (
        <div className="bg-white shadow rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Active Knowledge Sources</h4>
            <p className="text-sm text-gray-500">Currently utilized knowledge bases</p>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {metrics.active_sources.map((source, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  📝 {source}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Investigation Context */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-gray-900">Investigation Context</h5>
            <p className="text-xs text-gray-500">ID: {investigationId}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {insights.length} Total Insights
            </div>
            <div className="text-xs text-gray-500">
              {uniqueAgents} Agents Active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGAnalyticsDashboard;