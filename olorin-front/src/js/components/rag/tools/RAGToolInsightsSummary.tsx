import React from 'react';
import { RAGToolInsight } from '../../../types/RAGTypes';
import { calculateInsightsSummary } from '../../../utils/ragToolUtils';

interface RAGToolInsightsSummaryProps {
  insights: RAGToolInsight[];
}

/**
 * Summary statistics footer for RAG Tool Insights
 */
const RAGToolInsightsSummary: React.FC<RAGToolInsightsSummaryProps> = ({ insights }) => {
  const summary = calculateInsightsSummary(insights);

  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-gray-900">{summary.total}</div>
          <div className="text-xs text-gray-500">Total Insights</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{summary.highConfidence}</div>
          <div className="text-xs text-gray-500">High Confidence</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{summary.withAlternatives}</div>
          <div className="text-xs text-gray-500">With Alternatives</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">
            {summary.avgEffectiveness.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Avg Effectiveness</div>
        </div>
      </div>
    </div>
  );
};

export default RAGToolInsightsSummary;