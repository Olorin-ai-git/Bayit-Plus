import React from 'react';
import { RAGDomainMetrics } from '../../../types/RAGTypes';

interface RAGDomainDetailsProps {
  domain: RAGDomainMetrics;
}

const RAGDomainDetails: React.FC<RAGDomainDetailsProps> = ({ domain }) => {
  return (
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
  );
};

export default RAGDomainDetails;