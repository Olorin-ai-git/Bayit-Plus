import React from 'react';
import RAGKnowledgePanel from './RAGKnowledgePanel';
import { RAGKnowledgeSource, RAGMetrics } from '../../types/RAGTypes';

interface RAGEnhancementMetricsProps {
  knowledgeSources: RAGKnowledgeSource[];
  metrics: RAGMetrics;
  onSourceClick: (source: RAGKnowledgeSource) => void;
}

/**
 * RAG Enhancement Metrics Component - Knowledge Sources and Context
 * Focused on knowledge base utilization and source management
 */
const RAGEnhancementMetrics: React.FC<RAGEnhancementMetricsProps> = ({
  knowledgeSources,
  metrics,
  onSourceClick,
}) => {
  if (knowledgeSources.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 text-center">
        <div className="text-sm text-gray-500">
          No knowledge sources available
        </div>
      </div>
    );
  }

  return (
    <RAGKnowledgePanel
      knowledgeSources={knowledgeSources}
      contextSize={2048}
      retrievalTime={metrics.avg_retrieval_time}
      onSourceClick={onSourceClick}
    />
  );
};

export default RAGEnhancementMetrics;