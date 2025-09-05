import React from 'react';
import RAGStatusIndicator from './RAGStatusIndicator';
import RAGPerformanceMetrics from './RAGPerformanceMetrics';
import { RAGStatusData, RAGMetrics } from '../../types/RAGTypes';

interface RAGEnhancementCoreProps {
  status: RAGStatusData;
  metrics: RAGMetrics;
  onToggleInsights: () => void;
}

/**
 * Core RAG Enhancement Component - Status and Metrics Display
 * Focused on essential RAG status and performance indicators
 */
const RAGEnhancementCore: React.FC<RAGEnhancementCoreProps> = ({
  status,
  metrics,
  onToggleInsights,
}) => {
  return (
    <div className="space-y-4">
      {/* Status Indicator */}
      <RAGStatusIndicator
        isRAGEnabled={status.isEnabled}
        currentOperation={status.currentOperation}
        confidence={status.confidence}
        processingState={status.processingState}
        onToggleInsights={onToggleInsights}
        className="w-full"
      />

      {/* Performance Metrics */}
      <RAGPerformanceMetrics
        metrics={metrics}
        realTime={true}
        compact={true}
      />
    </div>
  );
};

export default RAGEnhancementCore;