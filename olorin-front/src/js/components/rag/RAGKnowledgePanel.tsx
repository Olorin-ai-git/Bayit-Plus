import React, { useState } from 'react';
import { RAGKnowledgePanelProps, RAGKnowledgeSource } from '../../types/RAGTypes';

/**
 * RAG Knowledge Panel Component
 * Displays knowledge sources, context information, and attribution details
 */
const RAGKnowledgePanel: React.FC<RAGKnowledgePanelProps> = ({
  knowledgeSources,
  contextSize,
  retrievalTime,
  onSourceClick,
  className = '',
}) => {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [showAllSources, setShowAllSources] = useState(false);

  // Toggle source expansion
  const toggleSourceExpansion = (sourceName: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceName)) {
      newExpanded.delete(sourceName);
    } else {
      newExpanded.add(sourceName);
    }
    setExpandedSources(newExpanded);
  };

  // Format context size
  const formatContextSize = (size: number): string => {
    if (size < 1024) return `${size} chars`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  // Get source type icon
  const getSourceTypeIcon = (type: RAGKnowledgeSource['type']) => {
    switch (type) {
      case 'document':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'pattern':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'rule':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m0 0h6a2 2 0 002-2V7a2 2 0 00-2-2h-2m-6 10v2a2 2 0 002 2h2a2 2 0 002-2v-2" />
          </svg>
        );
      case 'model':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    if (confidence >= 0.4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  // Sort sources by relevance and confidence
  const sortedSources = [...knowledgeSources].sort(
    (a, b) => (b.relevance * b.confidence) - (a.relevance * a.confidence)
  );

  const displayedSources = showAllSources ? sortedSources : sortedSources.slice(0, 3);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span>Knowledge Sources</span>
        </h3>
        <div className="text-sm text-gray-500">
          {knowledgeSources.length} sources
        </div>
      </div>

      {/* Context Summary */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Context Size:</span>
            <span className="ml-2 font-semibold text-gray-900">
              {formatContextSize(contextSize)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Retrieval Time:</span>
            <span className="ml-2 font-semibold text-gray-900">
              {retrievalTime}ms
            </span>
          </div>
        </div>
      </div>

      {/* Knowledge Sources List */}
      <div className="space-y-3">
        {displayedSources.map((source) => (
          <div 
            key={source.name}
            className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Source Header */}
                <div className="flex items-center space-x-2 mb-2">
                  {getSourceTypeIcon(source.type)}
                  <button
                    onClick={() => {
                      onSourceClick?.(source);
                      toggleSourceExpansion(source.name);
                    }}
                    className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors duration-200"
                  >
                    {source.name}
                  </button>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {source.type}
                  </span>
                </div>

                {/* Source Metrics */}
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <span>Confidence:</span>
                    <span className={`px-2 py-1 rounded-full font-medium ${getConfidenceColor(source.confidence)}`}>
                      {(source.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    Relevance: <span className="font-medium">{(source.relevance * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    Used: <span className="font-medium">{source.hitCount}x</span>
                  </div>
                  <div className="text-gray-500">
                    {new Date(source.lastUsed).toLocaleTimeString()}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedSources.has(source.name) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-600">
                      <div className="mb-1">
                        <strong>Last Used:</strong> {new Date(source.lastUsed).toLocaleString()}
                      </div>
                      <div className="mb-1">
                        <strong>Hit Count:</strong> {source.hitCount} times
                      </div>
                      <div className="mb-1">
                        <strong>Relevance Score:</strong> {(source.relevance * 100).toFixed(1)}%
                      </div>
                      <div>
                        <strong>Confidence Score:</strong> {(source.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Expand/Collapse Button */}
              <button
                onClick={() => toggleSourceExpansion(source.name)}
                className="flex-shrink-0 p-1 rounded-md hover:bg-gray-200 transition-colors duration-200"
                aria-label={expandedSources.has(source.name) ? 'Collapse details' : 'Expand details'}
              >
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    expandedSources.has(source.name) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Toggle */}
      {knowledgeSources.length > 3 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAllSources(!showAllSources)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200"
          >
            {showAllSources ? (
              <>Show Less ({knowledgeSources.length - 3} hidden)</>
            ) : (
              <>Show All ({knowledgeSources.length - 3} more)</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default RAGKnowledgePanel;
