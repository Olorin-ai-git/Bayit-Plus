import { useState, useCallback, useRef, useEffect } from 'react';
import { RAGMetrics, RAGOperationData, UseRAGMetricsReturn } from '../types/RAGTypes';

/**
 * Hook for managing RAG performance metrics
 * Tracks and aggregates RAG operation performance data
 */
export const useRAGMetrics = (): UseRAGMetricsReturn => {
  const [metrics, setMetrics] = useState<RAGMetrics>({
    total_queries: 0,
    avg_retrieval_time: 0,
    knowledge_hit_rate: 0,
    enhancement_success_rate: 0,
    total_knowledge_chunks: 0,
    active_sources: [],
  });

  const metricsRef = useRef(metrics);
  const operationHistory = useRef<RAGOperationData[]>([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  // Calculate aggregated metrics from operation history
  const calculateMetrics = useCallback((operations: RAGOperationData[]): RAGMetrics => {
    if (operations.length === 0) {
      return {
        total_queries: 0,
        avg_retrieval_time: 0,
        knowledge_hit_rate: 0,
        enhancement_success_rate: 0,
        total_knowledge_chunks: 0,
        active_sources: [],
      };
    }

    const totalQueries = operations.length;
    const retrievalTimes = operations
      .filter(op => op.retrieval_time !== undefined)
      .map(op => op.retrieval_time!);
    
    const avgRetrievalTime = retrievalTimes.length > 0 
      ? retrievalTimes.reduce((sum, time) => sum + time, 0) / retrievalTimes.length 
      : 0;

    const operationsWithKnowledge = operations.filter(op => 
      op.knowledge_sources && op.knowledge_sources.length > 0
    );
    const knowledgeHitRate = totalQueries > 0 
      ? operationsWithKnowledge.length / totalQueries 
      : 0;

    const successfulEnhancements = operations.filter(op => op.enhancement_applied);
    const enhancementSuccessRate = totalQueries > 0 
      ? successfulEnhancements.length / totalQueries 
      : 0;

    const totalKnowledgeChunks = operations.reduce((sum, op) => 
      sum + (op.knowledge_chunks_used || 0), 0
    );

    // Get unique active sources
    const activeSources = Array.from(
      new Set(
        operations
          .flatMap(op => op.knowledge_sources || [])
          .filter(Boolean)
      )
    );

    const lastOperationTime = operations.length > 0 
      ? Math.max(...operations.map(op => op.retrieval_time || 0))
      : undefined;

    return {
      total_queries: totalQueries,
      avg_retrieval_time: avgRetrievalTime,
      knowledge_hit_rate: knowledgeHitRate,
      enhancement_success_rate: enhancementSuccessRate,
      total_knowledge_chunks: totalKnowledgeChunks,
      active_sources: activeSources,
      last_operation_time: lastOperationTime,
    };
  }, []);

  // Update metrics directly
  const updateMetrics = useCallback((updates: Partial<RAGMetrics>) => {
    setMetrics(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Add new operation and recalculate metrics
  const addOperation = useCallback((operation: RAGOperationData) => {
    // Add to operation history
    operationHistory.current.push(operation);
    
    // Keep only last 100 operations to prevent memory issues
    if (operationHistory.current.length > 100) {
      operationHistory.current = operationHistory.current.slice(-100);
    }

    // Recalculate metrics
    const newMetrics = calculateMetrics(operationHistory.current);
    setMetrics(newMetrics);
  }, [calculateMetrics]);

  return {
    metrics,
    updateMetrics,
    addOperation,
  };
};

export default useRAGMetrics;
