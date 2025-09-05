import React, { useState } from 'react';
import { RAGSourceEffectivenessProps, RAGKnowledgeSource } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

/**
 * RAG Source Effectiveness Component
 * Analyzes performance of individual knowledge sources
 */
const RAGSourceEffectiveness: React.FC<RAGSourceEffectivenessProps> = ({
  investigationId,
  sources = [],
  sortBy = 'effectiveness',
  showInactive = false,
}) => {
  const [liveSources, setLiveSources] = useState<RAGKnowledgeSource[]>(sources);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onKnowledgeUpdate: (data) => {
      if (data.sourcesUpdate) {
        setLiveSources(data.sourcesUpdate);
      }
    },
  });

  const sortSources = (sources: RAGKnowledgeSource[]) => {
    return [...sources].sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'effectiveness':
          aValue = a.effectiveness;
          bValue = b.effectiveness;
          break;
        case 'usage':
          aValue = a.usageCount;
          bValue = b.usageCount;
          break;
        case 'relevance':
          aValue = a.avgRelevance;
          bValue = b.avgRelevance;
          break;
        case 'freshness':
          aValue = new Date(a.lastUpdated).getTime();
          bValue = new Date(b.lastUpdated).getTime();
          break;
        default:
          aValue = a.effectiveness;
          bValue = b.effectiveness;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  };

  const filterSources = (sources: RAGKnowledgeSource[]) => {
    if (!showInactive) {
      sources = sources.filter(s => s.isActive);
    }
    
    switch (filterBy) {
      case 'high':
        return sources.filter(s => s.effectiveness >= 0.8);
      case 'medium':
        return sources.filter(s => s.effectiveness >= 0.5 && s.effectiveness < 0.8);
      case 'low':
        return sources.filter(s => s.effectiveness < 0.5);
      default:
        return sources;
    }
  };

  const getEffectivenessColor = (effectiveness: number) => {
    if (effectiveness >= 0.8) return 'text-green-600 bg-green-100 border-green-200';
    if (effectiveness >= 0.5) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getEffectivenessLevel = (effectiveness: number) => {
    if (effectiveness >= 0.8) return 'High';
    if (effectiveness >= 0.5) return 'Medium';
    return 'Low';
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getFreshnessScore = (lastUpdated: string) => {
    const daysSinceUpdate = Math.floor(
      (new Date().getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceUpdate <= 7) return 1.0;
    if (daysSinceUpdate <= 30) return 0.8;
    if (daysSinceUpdate <= 90) return 0.6;
    if (daysSinceUpdate <= 180) return 0.4;
    return 0.2;
  };

  const filteredAndSortedSources = sortSources(filterSources(liveSources));

  const getSourceTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'documentation': '📚',
      'database': '💾',
      'api': '🔗',
      'file': '📄',
      'web': '🌐',
      'manual': '✍️',
      'automated': '🤖',
    };
    return icons[type.toLowerCase()] || '📄';
  };

  const renderSourceCard = (source: RAGKnowledgeSource) => {
    const isSelected = selectedSource === source.id;
    const freshnessScore = getFreshnessScore(source.lastUpdated);
    
    return (
      <div 
        key={source.id}
        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
          isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
        onClick={() => setSelectedSource(isSelected ? null : source.id)}
      >
        {/* Source Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getSourceTypeIcon(source.type)}</span>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{source.name}</h4>
              <p className="text-xs text-gray-500">{source.type} • {source.category}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              getEffectivenessColor(source.effectiveness)
            }`}>
              {getEffectivenessLevel(source.effectiveness)}
            </span>
            {!source.isActive && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {(source.effectiveness * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Effectiveness</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{source.usageCount}</div>
            <div className="text-xs text-gray-500">Queries</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {(source.avgRelevance * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Relevance</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {(freshnessScore * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Freshness</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-2 mb-3">
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Effectiveness</span>
              <span>{(source.effectiveness * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  source.effectiveness >= 0.8 ? 'bg-green-500' :
                  source.effectiveness >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${source.effectiveness * 100}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Usage Frequency</span>
              <span>{source.usageCount} queries</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.min(100, (source.usageCount / Math.max(...liveSources.map(s => s.usageCount))) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isSelected && (
          <div className="border-t border-gray-200 pt-3 space-y-3">
            {/* Description */}
            <div>
              <h5 className="text-xs font-semibold text-gray-700 mb-1">Description</h5>
              <p className="text-xs text-gray-600">{source.description}</p>
            </div>
            
            {/* Performance Metrics */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">Performance Details</h5>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Success Rate:</span>
                  <span className="ml-2 font-medium">{(source.successRate * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Avg Response Time:</span>
                  <span className="ml-2 font-medium">{source.avgResponseTime}ms</span>
                </div>
                <div>
                  <span className="text-gray-500">Error Rate:</span>
                  <span className="ml-2 font-medium">{(source.errorRate * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2 font-medium">{formatLastUpdated(source.lastUpdated)}</span>
                </div>
              </div>
            </div>
            
            {/* Topics */}
            {source.topics.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-1">Coverage Topics</h5>
                <div className="flex flex-wrap gap-1">
                  {source.topics.map((topic, idx) => (
                    <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recommendations */}
            <div className="bg-yellow-50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-yellow-800 mb-1">
                💡 Optimization Suggestions
              </h5>
              <ul className="text-xs text-yellow-700 space-y-1">
                {source.effectiveness < 0.5 && (
                  <li>• Consider reviewing content quality and relevance</li>
                )}
                {freshnessScore < 0.6 && (
                  <li>• Content may need updating - last modified {formatLastUpdated(source.lastUpdated)}</li>
                )}
                {source.errorRate > 0.1 && (
                  <li>• High error rate detected - check source connectivity</li>
                )}
                {source.usageCount < 10 && (
                  <li>• Low usage - consider promoting or archiving</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Source Effectiveness</h3>
            <p className="text-sm text-gray-500">
              {filteredAndSortedSources.length} sources • Performance analysis and optimization
            </p>
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

      {/* Controls */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="effectiveness">Effectiveness</option>
              <option value="usage">Usage Count</option>
              <option value="relevance">Relevance</option>
              <option value="freshness">Freshness</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select 
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Sources</option>
              <option value="high">High Effectiveness</option>
              <option value="medium">Medium Effectiveness</option>
              <option value="low">Low Effectiveness</option>
            </select>
          </div>
          
          <label className="flex items-center text-sm text-gray-600">
            <input 
              type="checkbox" 
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Show Inactive
          </label>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="p-6">
        {filteredAndSortedSources.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAndSortedSources.map(renderSourceCard)}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📚</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Sources Found</h4>
            <p className="text-sm text-gray-500">
              {filterBy !== 'all' ? 'Try adjusting your filter criteria.' : 'No knowledge sources are currently available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RAGSourceEffectiveness;