import React from 'react';
import { RAGKnowledgeSourceExtended } from '../../../types/RAGTypes';

interface SourceDetailsProps {
  source: RAGKnowledgeSourceExtended;
  freshnessScore: number;
}

const SourceDetails: React.FC<SourceDetailsProps> = ({ source, freshnessScore }) => {
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

  return (
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
            {source.topics.map((topic: string, idx: number) => (
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
  );
};

export default SourceDetails;