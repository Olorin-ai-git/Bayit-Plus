import React, { useState } from 'react';
import { RAGToolInsightsProps, RAGToolInsight } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';
import RAGToolInsightCard from './RAGToolInsightCard';
import RAGToolInsightDetails from './RAGToolInsightDetails';
import RAGToolInsightsHeader from './RAGToolInsightsHeader';
import RAGToolInsightsSummary from './RAGToolInsightsSummary';
import { sortInsights, createInsightFromEvent } from '../../../utils/ragToolUtils';

/**
 * RAG Tool Insights Component
 * Displays tool recommendation reasoning and context-aware suggestions
 */
const RAGToolInsights: React.FC<RAGToolInsightsProps> = ({
  investigationId,
  toolInsights = [],
  showAlternatives = true,
}) => {
  const [liveInsights, setLiveInsights] = useState<RAGToolInsight[]>(toolInsights);
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'confidence' | 'effectiveness' | 'recent'>('confidence');

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onRAGEvent: (event) => {
      if (event.type === 'rag_tool_recommendation') {
        const newInsight = createInsightFromEvent(event);
        setLiveInsights(prev => [newInsight, ...prev].slice(0, 50)); // Keep last 50
      }
    },
  });

  const sortedInsights = sortInsights(liveInsights, sortBy);

  const renderInsightCard = (insight: RAGToolInsight) => {
    const isSelected = selectedInsight === insight.id;
    
    return (
      <div key={insight.id}>
        <RAGToolInsightCard
          insight={insight}
          isSelected={isSelected}
          onSelect={setSelectedInsight}
          showAlternatives={showAlternatives}
        />
        {isSelected && <RAGToolInsightDetails insight={insight} />}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <RAGToolInsightsHeader
        insightsCount={liveInsights.length}
        sortBy={sortBy}
        onSortChange={setSortBy}
        isConnected={isConnected}
      />

      {/* Tool Insights */}
      <div className="p-6">
        {sortedInsights.length > 0 ? (
          <div className="space-y-4">
            {sortedInsights.map(renderInsightCard)}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔧</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Tool Insights Available</h4>
            <p className="text-sm text-gray-500">
              Tool recommendations and insights will appear here as the investigation progresses.
            </p>
          </div>
        )}
      </div>

      {liveInsights.length > 0 && (
        <RAGToolInsightsSummary insights={liveInsights} />
      )}
    </div>
  );
};

export default RAGToolInsights;