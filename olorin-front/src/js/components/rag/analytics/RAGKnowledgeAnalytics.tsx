import React, { useState, useEffect } from 'react';
import { RAGKnowledgeAnalyticsProps, RAGKnowledgeMetrics } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

/**
 * RAG Knowledge Analytics Component
 * Advanced knowledge base effectiveness metrics and analytics
 */
const RAGKnowledgeAnalytics: React.FC<RAGKnowledgeAnalyticsProps> = ({
  investigationId,
  timeRange = '24h',
  showDetailedMetrics = true,
}) => {
  const [knowledgeMetrics, setKnowledgeMetrics] = useState<RAGKnowledgeMetrics>({
    totalQueries: 0,
    successfulRetrievals: 0,
    averageRelevanceScore: 0,
    knowledgeBaseSize: 0,
    activeSourcesCount: 0,
    coveragePercentage: 0,
    freshnessScore: 0,
    sourcesBreakdown: [],
    queryPatterns: [],
    gapAnalysis: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onKnowledgeUpdate: (data) => {
      setKnowledgeMetrics(data.metrics);
      setIsLoading(false);
    },
    onRAGEvent: (event) => {
      // Update metrics based on RAG events
      if (event.type === 'rag_knowledge_retrieval') {
        setKnowledgeMetrics(prev => ({
          ...prev,
          totalQueries: prev.totalQueries + 1,
          successfulRetrievals: event.data.success ? prev.successfulRetrievals + 1 : prev.successfulRetrievals,
        }));
      }
    },
  });

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
  ];

  const getEffectivenessColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getGradeFromScore = (score: number) => {
    if (score >= 0.9) return 'A+';
    if (score >= 0.8) return 'A';
    if (score >= 0.7) return 'B+';
    if (score >= 0.6) return 'B';
    if (score >= 0.5) return 'C+';
    return 'C';
  };

  const calculateRetrievalRate = () => {
    if (knowledgeMetrics.totalQueries === 0) return 0;
    return knowledgeMetrics.successfulRetrievals / knowledgeMetrics.totalQueries;
  };

  const mainMetrics = [
    {
      label: 'Knowledge Base Size',
      value: knowledgeMetrics.knowledgeBaseSize,
      format: (v: number) => `${(v / 1000).toFixed(1)}k docs`,
      icon: '📚',
      trend: '+12%',
    },
    {
      label: 'Retrieval Success Rate',
      value: calculateRetrievalRate(),
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      icon: '🎯',
      trend: '+5.2%',
    },
    {
      label: 'Average Relevance',
      value: knowledgeMetrics.averageRelevanceScore,
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
      icon: '⭐',
      trend: '+2.1%',
    },
    {
      label: 'Knowledge Coverage',
      value: knowledgeMetrics.coveragePercentage,
      format: (v: number) => `${v.toFixed(0)}%`,
      icon: '🗺️',
      trend: '+8.7%',
    },
    {
      label: 'Content Freshness',
      value: knowledgeMetrics.freshnessScore,
      format: (v: number) => getGradeFromScore(v),
      icon: '🌱',
      trend: '-1.5%',
    },
    {
      label: 'Active Sources',
      value: knowledgeMetrics.activeSourcesCount,
      format: (v: number) => v.toString(),
      icon: '🔗',
      trend: '+3',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Knowledge Analytics</h3>
            <p className="text-sm text-gray-500">
              Knowledge base effectiveness and utilization insights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
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

      {/* Main Metrics Grid */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-500">Loading knowledge analytics...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {mainMetrics.map((metric, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{metric.icon}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    metric.trend.startsWith('+') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {metric.trend}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {metric.format(metric.value)}
                  </p>
                  <p className="text-sm text-gray-600">{metric.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Analytics */}
        {showDetailedMetrics && !isLoading && (
          <div className="mt-8 space-y-6">
            {/* Sources Breakdown */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-blue-900 mb-4">
                📊 Knowledge Sources Performance
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {knowledgeMetrics.sourcesBreakdown.slice(0, 6).map((source, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900 truncate">
                        {source.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        getEffectivenessColor(source.effectiveness)
                      }`}>
                        {(source.effectiveness * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-blue-700">
                        <span>Usage:</span>
                        <span>{source.usageCount} queries</span>
                      </div>
                      <div className="flex justify-between text-xs text-blue-700">
                        <span>Avg Relevance:</span>
                        <span>{(source.avgRelevance * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${source.effectiveness * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Query Patterns */}
            <div className="bg-purple-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-purple-900 mb-4">
                🔍 Common Query Patterns
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {knowledgeMetrics.queryPatterns.slice(0, 8).map((pattern, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-900">
                        {pattern.pattern}
                      </span>
                      <span className="text-xs text-purple-600">
                        {pattern.frequency} times
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-purple-700">
                        <span>Success Rate:</span>
                        <span>{(pattern.successRate * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-1">
                        <div 
                          className="bg-purple-600 h-1 rounded-full"
                          style={{ width: `${pattern.successRate * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gap Analysis */}
            <div className="bg-red-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-red-900 mb-4">
                🕵️ Knowledge Gap Analysis
              </h4>
              {knowledgeMetrics.gapAnalysis.length > 0 ? (
                <div className="space-y-3">
                  {knowledgeMetrics.gapAnalysis.slice(0, 5).map((gap, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-semibold text-red-900">
                          {gap.topic}
                        </h5>
                        <span className="text-xs text-red-600">
                          Gap Score: {gap.gapScore.toFixed(1)}/10
                        </span>
                      </div>
                      <p className="text-xs text-red-700 mb-2">{gap.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-red-600">
                          Failed Queries: {gap.failedQueries}
                        </span>
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                          Priority: {gap.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm text-red-700">No significant knowledge gaps detected</p>
                  <p className="text-xs text-red-600 mt-1">Your knowledge base coverage is comprehensive</p>
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="bg-green-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-green-900 mb-4">
                💡 Optimization Recommendations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h5 className="text-sm font-semibold text-green-900 mb-2">
                    🚀 Performance Boosters
                  </h5>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• Update low-performing sources with fresh content</li>
                    <li>• Expand knowledge base in identified gap areas</li>
                    <li>• Optimize query patterns for better retrieval</li>
                    <li>• Regular content freshness audits recommended</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h5 className="text-sm font-semibold text-green-900 mb-2">
                    🎯 Efficiency Improvements
                  </h5>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• Archive unused sources to reduce noise</li>
                    <li>• Implement semantic search improvements</li>
                    <li>• Add domain-specific knowledge vectors</li>
                    <li>• Enable user feedback loops for relevance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RAGKnowledgeAnalytics;