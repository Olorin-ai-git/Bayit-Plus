import React, { useEffect, useState } from 'react';
import AutonomousInvestigationPanel from './AutonomousInvestigationPanel';
import RAGEnhancementSection from './rag/RAGEnhancementSection';
import { useSimpleAutonomousInvestigation } from '../hooks/useAutonomousInvestigation';
import { AutonomousInvestigationStatus } from '../types/AnalyzeResponse';
import { LogEntry } from '../types/RiskAssessment';
import useRAGStatus from '../hooks/useRAGStatus';
import useRAGMetrics from '../hooks/useRAGMetrics';
import useRAGInsights from '../hooks/useRAGInsights';
import { RAGEventData } from '../types/RAGTypes';

interface RAGEnhancedAutonomousInvestigationPanelProps {
  entityId: string;
  entityType: string;
  investigationId: string;
  onInvestigationComplete?: () => void;
  onInvestigationStart?: () => void;
  isInvestigating?: boolean;
  onLog?: (logEntry: LogEntry) => void;
  onStepUpdate?: (
    stepId: string,
    riskScore: number,
    llmThoughts: string,
  ) => void;
  closeInvestigation?: () => void;
}

/**
 * RAG-Enhanced Autonomous Investigation Panel
 * Combines standard autonomous investigation with RAG enhancement indicators
 */
const RAGEnhancedAutonomousInvestigationPanel: React.FC<
  RAGEnhancedAutonomousInvestigationPanelProps
> = ({
  entityId,
  entityType,
  investigationId,
  onInvestigationComplete,
  onInvestigationStart,
  isInvestigating = false,
  onLog,
  onStepUpdate,
  closeInvestigation,
}) => {
  const {
    startInvestigation,
    status,
    progress,
  } = useSimpleAutonomousInvestigation();

  const { updateStatus } = useRAGStatus();
  const { addOperation } = useRAGMetrics();
  const { addInsight } = useRAGInsights();

  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showRAGSection, setShowRAGSection] = useState(true);

  // Handle investigation completion
  useEffect(() => {
    if (
      status === AutonomousInvestigationStatus.COMPLETED ||
      (status === 'COMPLETED' && progress >= 100)
    ) {
      setIsCompleted(true);
      onInvestigationComplete?.();

      // Disable RAG when investigation completes
      updateStatus({
        isEnabled: false,
        processingState: 'idle',
      });

      // Close investigation after delay
      setTimeout(() => {
        closeInvestigation?.();
      }, 1000);
    }
  }, [status, progress, onInvestigationComplete, closeInvestigation, updateStatus]);

  // Start investigation when isInvestigating becomes true
  useEffect(() => {
    if (isInvestigating && !hasStarted && !isCompleted) {
      const handleStartInvestigation = async () => {
        try {
          setHasStarted(true);
          onInvestigationStart?.();
          
          // Enable RAG when starting investigation
          updateStatus({
            isEnabled: true,
            processingState: 'retrieving',
            currentOperation: 'Initializing RAG-enhanced investigation',
            confidence: 0.75,
          });

          // Add initial RAG insight
          addInsight({
            type: 'knowledge_retrieval',
            agent: 'Investigation Orchestrator',
            operation: 'RAG system initialization',
            sources: ['investigation_patterns.json'],
            confidence: 0.85,
            details: {
              mode: 'autonomous',
              enhancement_level: 'high',
            },
          });
          
          await startInvestigation(
            entityId,
            entityType,
            investigationId,
            onLog,
          );
        } catch (err) {
          console.error('Failed to start RAG-enhanced autonomous investigation:', err);
          setHasStarted(false);
          
          // Disable RAG on error
          updateStatus({
            isEnabled: false,
            processingState: 'idle',
          });
        }
      };

      handleStartInvestigation();
    }
  }, [
    isInvestigating,
    hasStarted,
    isCompleted,
    investigationId,
    startInvestigation,
    entityId,
    entityType,
    onInvestigationStart,
    onLog,
    updateStatus,
    addInsight,
  ]);

  // Reset states when investigation ID changes
  useEffect(() => {
    setHasStarted(false);
    setIsCompleted(false);
    
    // Reset RAG state for new investigation
    updateStatus({
      isEnabled: false,
      processingState: 'idle',
      currentOperation: '',
      confidence: 0,
    });
  }, [investigationId, updateStatus]);

  // Mock RAG event handling (in production, would come from WebSocket)
  const simulateRAGEvents = () => {
    // Simulate RAG knowledge retrieval
    setTimeout(() => {
      const ragEvent: RAGEventData = {
        type: 'rag_knowledge_retrieved',
        investigation_id: investigationId,
        agent_type: 'network_agent',
        timestamp: new Date().toISOString(),
        data: {
          operation: 'fraud_pattern_matching',
          knowledge_sources: ['fraud_patterns.md', 'network_indicators.json'],
          context_size: 1536,
          retrieval_time: 185,
          confidence_score: 0.89,
          enhancement_applied: true,
          knowledge_chunks_used: 4,
        },
      };

      addOperation(ragEvent.data);
      addInsight({
        type: 'knowledge_retrieval',
        agent: 'Network Agent',
        operation: ragEvent.data.operation,
        sources: ragEvent.data.knowledge_sources || [],
        confidence: ragEvent.data.confidence_score || 0,
        details: ragEvent.data,
      });

      updateStatus({
        processingState: 'augmenting',
        currentOperation: 'Enhancing analysis with retrieved knowledge',
        confidence: ragEvent.data.confidence_score,
      });
    }, 3000);
  };

  // Start RAG simulation when investigation begins
  useEffect(() => {
    if (hasStarted && !isCompleted) {
      simulateRAGEvents();
    }
  }, [hasStarted, isCompleted]);

  return (
    <div className="space-y-4">
      {/* Standard Autonomous Investigation Panel */}
      <AutonomousInvestigationPanel
        entityId={entityId}
        entityType={entityType}
        investigationId={investigationId}
        isInvestigating={isInvestigating && hasStarted}
        onLog={onLog}
        closeInvestigation={closeInvestigation}
        onInvestigationComplete={onInvestigationComplete}
        onInvestigationStart={onInvestigationStart}
        onStepUpdate={onStepUpdate}
      />

      {/* RAG Enhancement Section */}
      {showRAGSection && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>RAG-Enhanced Investigation</span>
            </h3>
            <button
              onClick={() => setShowRAGSection(!showRAGSection)}
              className="p-1 rounded-md hover:bg-white hover:bg-opacity-50 transition-colors duration-200"
              title="Toggle RAG section"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <RAGEnhancementSection 
            investigationId={investigationId}
            className="border-0 rounded-none"
          />
        </div>
      )}
    </div>
  );
};

export default RAGEnhancedAutonomousInvestigationPanel;
