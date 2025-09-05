import React from 'react';
import { RAGKnowledgeSourceExtended } from '../../../types/RAGTypes';

interface SourceMetricsProps {
  source: RAGKnowledgeSourceExtended;
  freshnessScore: number;
  maxUsageCount: number;
}

const SourceMetrics: React.FC<SourceMetricsProps> = ({
  source,
  freshnessScore,
  maxUsageCount,
}) => {
  return (
    <>
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
              style={{ width: `${Math.min(100, (source.usageCount / Math.max(1, maxUsageCount)) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SourceMetrics;