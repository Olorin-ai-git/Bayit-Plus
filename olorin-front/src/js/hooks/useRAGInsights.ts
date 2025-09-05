import { useState, useCallback } from 'react';
import { RAGInsight, UseRAGInsightsReturn } from '../types/RAGTypes';

/**
 * Hook for managing RAG insights and operations history
 * Tracks detailed RAG operation insights for analysis
 */
export const useRAGInsights = (): UseRAGInsightsReturn => {
  const [insights, setInsights] = useState<RAGInsight[]>([]);

  // Generate unique ID for insight
  const generateId = useCallback((): string => {
    return `rag_insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add new insight
  const addInsight = useCallback((insightData: Omit<RAGInsight, 'id' | 'timestamp'>) => {
    const insight: RAGInsight = {
      ...insightData,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };

    setInsights(prev => {
      const newInsights = [insight, ...prev];
      // Keep only last 50 insights to prevent memory issues
      return newInsights.slice(0, 50);
    });
  }, [generateId]);

  // Clear all insights
  const clearInsights = useCallback(() => {
    setInsights([]);
  }, []);

  // Get insights by agent
  const getInsightsByAgent = useCallback((agent: string): RAGInsight[] => {
    return insights.filter(insight => 
      insight.agent.toLowerCase().includes(agent.toLowerCase())
    );
  }, [insights]);

  return {
    insights,
    addInsight,
    clearInsights,
    getInsightsByAgent,
  };
};

export default useRAGInsights;
