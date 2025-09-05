import React, { useState, useMemo } from 'react';
import { RAGDomainUtilizationProps, RAGDomainMetrics } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

/**
 * RAG Domain Utilization Component
 * Analyzes domain-specific knowledge patterns and utilization
 */
const RAGDomainUtilization: React.FC<RAGDomainUtilizationProps> = ({
  investigationId,
  domains = [],
  timeframe = '24h',
  showTrends = true,
}) => {
  const [liveDomains, setLiveDomains] = useState<RAGDomainMetrics[]>(domains);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'chart'>('grid');

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onDomainUpdate: (data) => {
      setLiveDomains(data.domains);
    },
    onRAGEvent: (event) => {
      // Update domain metrics based on RAG events
      if (event.data.domain) {
        setLiveDomains(prev => prev.map(domain => 
          domain.name === event.data.domain 
            ? { ...domain, queryCount: domain.queryCount + 1 }
            : domain
        ));
      }
    },
  });

  const sortedDomains = useMemo(() => {
    return [...liveDomains].sort((a, b) => b.utilizationScore - a.utilizationScore);
  }, [liveDomains]);

  const totalQueries = liveDomains.reduce((sum, domain) => sum + domain.queryCount, 0);
  const avgUtilization = liveDomains.length > 0 
    ? liveDomains.reduce((sum, domain) => sum + domain.utilizationScore, 0) / liveDomains.length 
    : 0;

  const getDomainIcon = (domain: string) => {
    const icons: Record<string, string> = {
      'security': '🔒',
      'fraud': '🕵️',
      'compliance': '📄',
      'risk': '⚠️',
      'device': '📱',
      'location': '🌍',
      'transaction': '💳',
      'network': '🌐',
      'behavioral': '🧠',
      'identity': '🆔',
      'general': '📊',
    };
    return icons[domain.toLowerCase()] || '📁';
  };

  const getUtilizationColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 0.6) return 'text-blue-600 bg-blue-100 border-blue-200';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getUtilizationLevel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Moderate';
    return 'Low';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return '📈 ↑';
    if (trend < -5) return '📉 ↓';
    return '➡️';
  };

  const renderDomainCard = (domain: RAGDomainMetrics) => {
    const utilizationPercentage = (domain.queryCount / Math.max(1, totalQueries)) * 100;
    const isSelected = selectedDomain === domain.name;
    
    return (
      <div 
        key={domain.name}
        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
          isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
        onClick={() => setSelectedDomain(isSelected ? null : domain.name)}
      >
        {/* Domain Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getDomainIcon(domain.name)}</span>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 capitalize">
                {domain.name} Domain
              </h4>
              <p className="text-xs text-gray-500">{domain.description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              getUtilizationColor(domain.utilizationScore)
            }`}>
              {getUtilizationLevel(domain.utilizationScore)}
            </span>
            {showTrends && domain.trend !== undefined && (
              <span className="text-xs text-gray-500">
                {getTrendIcon(domain.trend)} {domain.trend > 0 ? '+' : ''}{domain.trend.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{domain.queryCount}</div>
            <div className="text-xs text-gray-500">Queries</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {utilizationPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Share</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {(domain.successRate * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Success</div>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Utilization Score</span>
            <span>{(domain.utilizationScore * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                domain.utilizationScore >= 0.8 ? 'bg-green-500' :
                domain.utilizationScore >= 0.6 ? 'bg-blue-500' :
                domain.utilizationScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${domain.utilizationScore * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Top Topics */}
        {domain.topTopics && domain.topTopics.length > 0 && (
          <div className="mb-3">
            <h5 className="text-xs font-semibold text-gray-700 mb-1">Popular Topics</h5>
            <div className="flex flex-wrap gap-1">
              {domain.topTopics.slice(0, 3).map((topic, idx) => (
                <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {topic}
                </span>
              ))}
              {domain.topTopics.length > 3 && (
                <span className="text-xs text-gray-500">+{domain.topTopics.length - 3} more</span>
              )}
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isSelected && (
          <div className="border-t border-gray-200 pt-3 space-y-3">
            {/* Performance Breakdown */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">Performance Breakdown</h5>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Avg Response Time:</span>
                  <span className="ml-2 font-medium">{domain.avgResponseTime}ms</span>
                </div>
                <div>
                  <span className="text-gray-500">Knowledge Hits:</span>
                  <span className="ml-2 font-medium">{domain.knowledgeHitCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Coverage Score:</span>
                  <span className="ml-2 font-medium">{(domain.coverageScore * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Quality Rating:</span>
                  <span className="ml-2 font-medium">{domain.qualityRating.toFixed(1)}/5</span>
                </div>
              </div>
            </div>

            {/* Knowledge Sources */}
            {domain.knowledgeSources && domain.knowledgeSources.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2">Key Knowledge Sources</h5>
                <div className="space-y-2">
                  {domain.knowledgeSources.slice(0, 3).map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-blue-50 p-2 rounded">
                      <span className="text-blue-900">{source.name}</span>
                      <span className="text-blue-700">{source.usageCount} uses</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usage Patterns */}
            {domain.usagePatterns && domain.usagePatterns.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2">Usage Patterns</h5>
                <div className="space-y-1">
                  {domain.usagePatterns.slice(0, 3).map((pattern, idx) => (
                    <div key={idx} className="text-xs text-gray-600">
                      • {pattern.description} ({pattern.frequency}% of queries)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-green-50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-green-800 mb-2">
                💡 Optimization Recommendations
              </h5>
              <ul className="text-xs text-green-700 space-y-1">
                {domain.utilizationScore < 0.6 && (
                  <li>• Expand knowledge base for {domain.name} domain</li>
                )}
                {domain.successRate < 0.8 && (
                  <li>• Review and improve query matching accuracy</li>
                )}
                {domain.avgResponseTime > 2000 && (
                  <li>• Optimize response time for better user experience</li>
                )}
                {domain.coverageScore < 0.7 && (
                  <li>• Add more comprehensive coverage for this domain</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChartView = () => {
    const maxQueries = Math.max(...liveDomains.map(d => d.queryCount));
    
    return (
      <div className="space-y-4">
        {sortedDomains.map((domain, index) => {
          const barWidth = (domain.queryCount / maxQueries) * 100;
          const utilizationPercentage = (domain.queryCount / Math.max(1, totalQueries)) * 100;
          
          return (
            <div key={domain.name} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getDomainIcon(domain.name)}</span>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {domain.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {domain.queryCount} queries ({utilizationPercentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    getUtilizationColor(domain.utilizationScore).split(' ')[0]
                  }`}>
                    {(domain.utilizationScore * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {(domain.successRate * 100).toFixed(0)}% success
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div 
                    className={`h-6 rounded-full flex items-center px-3 text-white text-xs font-medium ${
                      domain.utilizationScore >= 0.8 ? 'bg-green-500' :
                      domain.utilizationScore >= 0.6 ? 'bg-blue-500' :
                      domain.utilizationScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(15, barWidth)}%` }}
                  >
                    {barWidth > 15 && `${domain.queryCount} queries`}
                  </div>
                </div>
                {showTrends && domain.trend !== undefined && (
                  <div className="absolute right-0 top-0 -mt-6 text-xs text-gray-500">
                    {getTrendIcon(domain.trend)} {domain.trend > 0 ? '+' : ''}{domain.trend.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Domain Utilization</h3>
            <p className="text-sm text-gray-500">
              {liveDomains.length} domains • {totalQueries} total queries • Avg utilization: {(avgUtilization * 100).toFixed(1)}%
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 border rounded-md">
              {['grid', 'list', 'chart'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === mode 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {mode === 'grid' && '🔲'}
                  {mode === 'list' && '🗺️'}
                  {mode === 'chart' && '📉'}
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
        {liveDomains.length > 0 ? (
          <div>
            {viewMode === 'chart' ? renderChartView() : (
              <div className={`${
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                  : 'space-y-4'
              }`}>
                {sortedDomains.map(renderDomainCard)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📁</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Domain Data Available</h4>
            <p className="text-sm text-gray-500">
              Domain utilization metrics will appear here once queries are processed.
            </p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {liveDomains.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{liveDomains.length}</div>
              <div className="text-xs text-gray-500">Active Domains</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {liveDomains.filter(d => d.utilizationScore >= 0.8).length}
              </div>
              <div className="text-xs text-gray-500">High Utilization</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {(avgUtilization * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Avg Utilization</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {totalQueries}
              </div>
              <div className="text-xs text-gray-500">Total Queries</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGDomainUtilization;