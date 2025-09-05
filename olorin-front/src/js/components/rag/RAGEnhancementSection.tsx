import React, { useState, useEffect } from 'react';
import RAGStatusIndicator from './RAGStatusIndicator';
import RAGPerformanceMetrics from './RAGPerformanceMetrics';
import RAGKnowledgePanel from './RAGKnowledgePanel';
import useRAGStatus from '../../hooks/useRAGStatus';
import useRAGMetrics from '../../hooks/useRAGMetrics';
import useRAGInsights from '../../hooks/useRAGInsights';
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

  // Mock knowledge sources for demonstration
  const mockKnowledgeSources: RAGKnowledgeSource[] = [
    {
      name: 'fraud_patterns.md',
      type: 'document',
      confidence: 0.92,
      relevance: 0.88,
      lastUsed: new Date().toISOString(),
      hitCount: 15,
    },
    {
      name: 'risk_indicators.json',
      type: 'rule',
      confidence: 0.85,
      relevance: 0.91,
      lastUsed: new Date(Date.now() - 300000).toISOString(),
      hitCount: 8,
    },
    {
      name: 'network_anomalies.json',
      type: 'pattern',
      confidence: 0.78,
      relevance: 0.82,
      lastUsed: new Date(Date.now() - 600000).toISOString(),
      hitCount: 12,
    },
  ];

  // Simulate RAG activity during investigation
  useEffect(() => {
    if (!investigationId) return;

    // Enable RAG when investigation starts
    updateStatus({
      isEnabled: true,
      processingState: 'retrieving',
      currentOperation: 'Initializing RAG system',
      confidence: 0.75,
    });

    // Simulate RAG operations
    const ragSimulation = setTimeout(() => {
      updateStatus({
        processingState: 'augmenting',
        currentOperation: 'Augmenting context with knowledge',
        confidence: 0.88,
      });

      // Add simulated metrics
      updateMetrics({
        total_queries: 5,
        avg_retrieval_time: 195,
        knowledge_hit_rate: 0.87,
        enhancement_success_rate: 0.94,
        total_knowledge_chunks: 15,
        active_sources: ['fraud_patterns.md', 'risk_indicators.json'],
      });

      // Add insights
      addInsight({
        type: 'knowledge_retrieval',
        agent: 'Network Agent',
        operation: 'Pattern matching against fraud database',
        sources: ['fraud_patterns.md'],
        confidence: 0.92,
        details: {
          matched_patterns: 3,
          risk_indicators: ['unusual_ip_patterns', 'vpn_usage'],
        },
      });
    }, 2000);

    // Simulate completion
    const completionTimeout = setTimeout(() => {
      updateStatus({
        processingState: 'idle',
        currentOperation: '',
        confidence: 0.91,
      });
    }, 8000);

    return () => {
      clearTimeout(ragSimulation);
      clearTimeout(completionTimeout);
    };
  }, [investigationId, updateStatus, updateMetrics, addInsight]);

  // Handle RAG WebSocket events (would be connected to actual WebSocket in production)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRAGEvent = (event: RAGEventData) => {
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
  };

  const handleRAGPerformanceUpdate = (data: RAGPerformanceData) => {
    updateMetrics(data.metrics);
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
        <div className="flex items-center space-x-2 text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
          </svg>
          <span className="text-sm font-medium">RAG Enhancement Disabled</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Knowledge-augmented analysis is not active for this investigation.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">RAG Enhancement</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-white hover:bg-opacity-50 transition-colors duration-200"
            aria-label={isExpanded ? 'Collapse RAG section' : 'Expand RAG section'}
          >
            <svg
              className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                isExpanded ? '' : 'rotate-180'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 space-y-4">
          {/* Status Indicator */}
          <RAGStatusIndicator
            isRAGEnabled={status.isEnabled}
            currentOperation={status.currentOperation}
            confidence={status.confidence}
            processingState={status.processingState}
            onToggleInsights={toggleInsights}
            className="w-full"
          />

          {/* Performance Metrics */}
          <RAGPerformanceMetrics
            metrics={metrics}
            realTime={true}
            compact={true}
          />

          {/* Knowledge Panel */}
          {mockKnowledgeSources.length > 0 && (
            <RAGKnowledgePanel
              knowledgeSources={mockKnowledgeSources}
              contextSize={2048}
              retrievalTime={metrics.avg_retrieval_time}
              onSourceClick={handleSourceClick}
            />
          )}

          {/* Insights Summary */}
          {insights.length > 0 && showInsights && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Recent RAG Insights ({insights.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {insights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className="text-xs text-gray-600">
                    <span className="font-medium text-gray-900">{insight.agent}:</span>{' '}
                    {insight.operation}
                    {insight.confidence > 0 && (
                      <span className="ml-1 text-green-600">
                        ({(insight.confidence * 100).toFixed(0)}% confidence)
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {insights.length > 3 && (
                <div className="text-xs text-gray-500 text-center mt-2">
                  +{insights.length - 3} more insights available
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RAGEnhancementSection;
