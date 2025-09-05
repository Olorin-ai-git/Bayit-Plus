/**
 * RAG (Retrieval-Augmented Generation) Types
 * TypeScript interfaces for RAG enhancement system
 */

export interface RAGEventData {
  type: 'rag_knowledge_retrieved' | 'rag_context_augmented' | 'rag_tool_recommended' | 'rag_result_enhanced';
  investigation_id: string;
  agent_type: string;
  timestamp: string;
  data: RAGOperationData;
}

export interface RAGOperationData {
  operation: string;
  knowledge_sources?: string[];
  context_size?: number;
  retrieval_time?: number;
  confidence_score?: number;
  enhancement_applied: boolean;
  tools_recommended?: string[];
  knowledge_chunks_used?: number;
}

export interface RAGPerformanceData {
  type: 'rag_performance_metrics';
  investigation_id: string;
  timestamp: string;
  metrics: RAGMetrics;
}

export interface RAGMetrics {
  total_queries: number;
  avg_retrieval_time: number;
  knowledge_hit_rate: number;
  enhancement_success_rate: number;
  total_knowledge_chunks: number;
  active_sources: string[];
  last_operation_time?: number;
}

export interface RAGStatusData {
  isEnabled: boolean;
  currentOperation?: string;
  confidence?: number;
  processingState: 'idle' | 'retrieving' | 'augmenting' | 'recommending' | 'enhancing';
  lastUpdate: string;
}

export interface RAGInsight {
  id: string;
  type: 'knowledge_retrieval' | 'context_augmentation' | 'tool_recommendation' | 'result_enhancement';
  agent: string;
  operation: string;
  sources: string[];
  confidence: number;
  timestamp: string;
  details: any;
}

export interface RAGKnowledgeSource {
  name: string;
  type: 'document' | 'pattern' | 'rule' | 'model';
  confidence: number;
  relevance: number;
  lastUsed: string;
  hitCount: number;
}

// Component Props Interfaces
export interface RAGStatusIndicatorProps {
  isRAGEnabled: boolean;
  currentOperation?: string;
  confidence?: number;
  processingState?: 'idle' | 'retrieving' | 'augmenting' | 'recommending' | 'enhancing';
  className?: string;
  onToggleInsights?: () => void;
}

export interface RAGPerformanceMetricsProps {
  metrics: RAGMetrics;
  realTime?: boolean;
  compact?: boolean;
  className?: string;
}

export interface RAGKnowledgePanelProps {
  knowledgeSources: RAGKnowledgeSource[];
  contextSize: number;
  retrievalTime: number;
  onSourceClick?: (source: RAGKnowledgeSource) => void;
  className?: string;
}

export interface RAGToolRecommendationsProps {
  recommendations: string[];
  confidence: number;
  reasoning?: string;
  onToolSelect?: (tool: string) => void;
  className?: string;
}

export interface RAGInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  insights: RAGInsight[];
  metrics: RAGMetrics;
  investigationId: string;
}

// Hook Return Types
export interface UseRAGStatusReturn {
  status: RAGStatusData;
  updateStatus: (data: Partial<RAGStatusData>) => void;
  isProcessing: boolean;
}

export interface UseRAGMetricsReturn {
  metrics: RAGMetrics;
  updateMetrics: (data: Partial<RAGMetrics>) => void;
  addOperation: (operation: RAGOperationData) => void;
}

export interface UseRAGInsightsReturn {
  insights: RAGInsight[];
  addInsight: (insight: Omit<RAGInsight, 'id' | 'timestamp'>) => void;
  clearInsights: () => void;
  getInsightsByAgent: (agent: string) => RAGInsight[];
}
