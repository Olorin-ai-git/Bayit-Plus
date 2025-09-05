import React, { useState, useEffect, useCallback } from 'react';
import RAGEnhancementCore from './RAGEnhancementCore';
import RAGEnhancementMetrics from './RAGEnhancementMetrics';
import RAGEnhancementControls from './RAGEnhancementControls';
import useRAGStatus from '../../hooks/useRAGStatus';
import useRAGMetrics from '../../hooks/useRAGMetrics';
import useRAGInsights from '../../hooks/useRAGInsights';
import useRAGWebSocket from '../../hooks/useRAGWebSocket';
import { RAGEventData, RAGPerformanceData, RAGKnowledgeSource } from '../../types/RAGTypes';

interface RAGEnhancementSectionProps {
  investigationId: string;
  className?: string;
}

/**
 * RAG Enhancement Section Component
 * Comprehensive RAG status, metrics, and insights display for investigation sidebar
 */
const RAGEnhancementSection: React.FC<RAGEnhancementSectionProps> = ({
  investigationId,
  className = '',
}) => {
  const { status, updateStatus } = useRAGStatus();
  const { metrics, addOperation, updateMetrics } = useRAGMetrics();
  const { insights, addInsight } = useRAGInsights();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [knowledgeSources, setKnowledgeSources] = useState<RAGKnowledgeSource[]>([]);

  // Initialize RAG system for investigation
  useEffect(() => {
    if (!investigationId) return;

    // Enable RAG when investigation starts
    updateStatus({
      isEnabled: true,
      processingState: 'retrieving',
      currentOperation: 'Initializing RAG system',
      confidence: 0.75,
    });

    // Set processing state to idle after initialization
    const initTimeout = setTimeout(() => {
      updateStatus({
        processingState: 'idle',
        currentOperation: '',
        confidence: 0.85,
      });
    }, 1000);

    return () => {
      clearTimeout(initTimeout);
    };
  }, [investigationId, updateStatus]);

  // WebSocket event handlers
  const handleRAGEvent = useCallback((event: RAGEventData) => {
    const { type, agent_type, data } = event;
    
    // Update status based on event
    let processingState: 'idle' | 'retrieving' | 'augmenting' | 'recommending' | 'enhancing' = 'idle';
    switch (type) {
      case 'rag_knowledge_retrieved':
        processingState = 'retrieving';
        break;
      case 'rag_context_augmented':
        processingState = 'augmenting';
        break;
      case 'rag_tool_recommended':
        processingState = 'recommending';
        break;
      case 'rag_result_enhanced':
        processingState = 'enhancing';
        break;
    }

    updateStatus({
      processingState,
      currentOperation: data.operation,
      confidence: data.confidence_score,
    });

    // Add to metrics
    addOperation(data);

    // Add insight
    addInsight({
      type: type.replace('rag_', '') as any,
      agent: agent_type,
      operation: data.operation,
      sources: data.knowledge_sources || [],
      confidence: data.confidence_score || 0,
      details: data,
    });
  }, [updateStatus, addOperation, addInsight]);

  const handlePerformanceUpdate = useCallback((data: RAGPerformanceData) => {
    updateMetrics(data.metrics);
  }, [updateMetrics]);

  const handleKnowledgeSourcesUpdate = useCallback((sources: RAGKnowledgeSource[]) => {
    setKnowledgeSources(sources);
  }, []);

  const handleWebSocketError = useCallback((error: Event) => {
    console.error('RAG WebSocket error:', error);
    // Could show error notification to user
  }, []);

  // WebSocket integration for real-time RAG data
  const { isConnected, isReconnecting, error } = useRAGWebSocket({
    investigationId,
    onRAGEvent: handleRAGEvent,
    onPerformanceUpdate: handlePerformanceUpdate,
    onKnowledgeSourcesUpdate: handleKnowledgeSourcesUpdate,
    onError: handleWebSocketError,
  });

  // Connection status indicator
  const connectionStatus = () => {
    if (isReconnecting) return 'Reconnecting...';
    if (!isConnected) return 'Disconnected';
    if (error) return `Error: ${error}`;
    return 'Connected';
  };

  const toggleInsights = () => {
    setShowInsights(!showInsights);
  };

  const handleSourceClick = (source: RAGKnowledgeSource) => {
    console.log('Knowledge source clicked:', source);
    // In production, could show detailed source information
  };

  if (!status.isEnabled) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
            </svg>
            <span className="text-sm font-medium">RAG Enhancement Disabled</span>
          </div>
          <div className="text-xs text-gray-400">
            {connectionStatus()}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Knowledge-augmented analysis is not active for this investigation.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>

      {/* Header Controls */}
      <RAGEnhancementControls
        insights={insights}
        showInsights={showInsights}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />

      {/* Content */}
      {isExpanded && (
        <div className="p-3 space-y-4">
          {/* Core RAG Status and Metrics */}
          <RAGEnhancementCore
            status={status}
            metrics={metrics}
            onToggleInsights={toggleInsights}
          />

          {/* Knowledge Sources and Metrics */}
          <RAGEnhancementMetrics
            knowledgeSources={knowledgeSources}
            metrics={metrics}
            onSourceClick={handleSourceClick}
          />
        </div>
      )}
    </div>
  );
};

export default RAGEnhancementSection;
