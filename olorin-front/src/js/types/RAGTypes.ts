/**
 * RAG (Retrieval-Augmented Generation) Types
 * TypeScript interfaces for RAG enhancement system
 */

export interface RAGEventData {
  type: 'rag_knowledge_retrieved' | 'rag_context_augmented' | 'rag_tool_recommended' | 'rag_result_enhanced' | 
        'rag_knowledge_retrieval' | 'rag_tool_alternatives' | 'rag_tool_recommendation' | 'rag_tool_execution';
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
  // Additional properties used by components
  domain?: string;
  success?: boolean;
  reasoning?: string;
  description?: string;
  processing_time?: number;
  tools_used?: string[];
  insights?: string[];
  alternatives?: any[];
  recommendation?: string;
  context_factors?: string[];
  effectiveness_score?: number;
  recommended_tool?: string;
  tool_name?: string;
  execution_time?: number;
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
  // Extended metrics for operational components
  querySuccessRate?: number;
  averageResponseTime?: number;
  knowledgeBaseHitRate?: number;
  activeSources?: number;
  errorRate?: number;
  systemLoad?: number;
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

// Extended Interfaces for Advanced RAG Components
export interface RAGOperationalMetricsProps {
  metrics: RAGMetrics & {
    querySuccessRate: number;
    averageResponseTime: number;
    knowledgeBaseHitRate: number;
    activeSources: number;
    errorRate: number;
    systemLoad: number;
  };
  investigationId: string;
  showDetails?: boolean;
  refreshInterval?: number;
}

export interface RAGJourneyStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  agent: string;
  ragEnhancement?: {
    applied: boolean;
    type: string;
    confidence: number;
    sources: string[];
    reasoning: string;
  };
  timestamp: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  duration: number;
  tools: string[];
  insights: string[];
}

export interface RAGJourneyViewerProps {
  investigationId: string;
  journeySteps?: RAGJourneyStep[];
  currentStep?: number;
  onStepSelect?: (stepIndex: number, step: RAGJourneyStep) => void;
  showDetails?: boolean;
}

export interface RAGJourneyTimelineProps {
  investigationId: string;
  journeySteps?: RAGJourneyStep[];
  selectedStepId?: string;
  onStepClick?: (step: RAGJourneyStep, index: number) => void;
  showTimeLabels?: boolean;
  compactMode?: boolean;
}

export interface RAGJourneyStepsProps {
  steps: RAGJourneyStep[];
  currentStepIndex?: number;
  onStepSelect?: (step: RAGJourneyStep, index: number) => void;
  showStepDetails?: boolean;
  groupByAgent?: boolean;
  setGroupByAgent?: (grouped: boolean) => void;
}

export interface RAGKnowledgeMetrics {
  totalQueries: number;
  successfulRetrievals: number;
  averageRelevanceScore: number;
  knowledgeBaseSize: number;
  activeSourcesCount: number;
  coveragePercentage: number;
  freshnessScore: number;
  sourcesBreakdown: {
    name: string;
    effectiveness: number;
    usageCount: number;
    avgRelevance: number;
  }[];
  queryPatterns: {
    pattern: string;
    frequency: number;
    successRate: number;
  }[];
  gapAnalysis: {
    topic: string;
    description: string;
    gapScore: number;
    failedQueries: number;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface RAGKnowledgeAnalyticsProps {
  investigationId: string;
  timeRange?: string;
  showDetailedMetrics?: boolean;
}

export interface RAGKnowledgeSourceExtended {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  effectiveness: number;
  usageCount: number;
  avgRelevance: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
  lastUpdated: string;
  isActive: boolean;
  topics: string[];
}

export interface RAGSourceEffectivenessProps {
  investigationId: string;
  sources?: RAGKnowledgeSourceExtended[];
  sortBy?: 'effectiveness' | 'usage' | 'relevance' | 'freshness';
  showInactive?: boolean;
}

export interface RAGDomainMetrics {
  name: string;
  description: string;
  utilizationScore: number;
  queryCount: number;
  successRate: number;
  avgResponseTime: number;
  knowledgeHitCount: number;
  coverageScore: number;
  qualityRating: number;
  trend?: number;
  topTopics?: string[];
  knowledgeSources?: {
    name: string;
    usageCount: number;
  }[];
  usagePatterns?: {
    description: string;
    frequency: number;
  }[];
}

export interface RAGDomainUtilizationProps {
  investigationId: string;
  domains?: RAGDomainMetrics[];
  timeframe?: string;
  showTrends?: boolean;
}

export interface RAGToolInsight {
  id: string;
  toolName: string;
  recommendation: string;
  reasoning: string;
  confidence: number;
  alternatives: string[];
  contextFactors: string[];
  effectiveness: number;
  usageHistory: {
    timestamp: string;
    success: boolean;
    context: string;
  }[];
}

export interface RAGToolInsightsProps {
  investigationId: string;
  toolInsights?: RAGToolInsight[];
  showAlternatives?: boolean;
}

export interface RAGToolAlternative {
  name: string;
  confidence: number;
  reasoning: string;
  pros: string[];
  cons: string[];
  suitabilityScore: number;
}

export interface RAGToolAlternativesProps {
  investigationId: string;
  primaryTool: string;
  alternatives?: RAGToolAlternative[];
  onAlternativeSelect?: (alternative: RAGToolAlternative) => void;
}

export interface RAGToolPerformanceMetrics {
  toolName: string;
  successRate: number;
  avgExecutionTime: number;
  errorRate: number;
  usageCount: number;
  userSatisfaction: number;
  trendsData: {
    timestamp: string;
    successRate: number;
    executionTime: number;
  }[];
}

export interface RAGToolPerformanceProps {
  investigationId: string;
  performanceData?: RAGToolPerformanceMetrics[];
  selectedTool?: string;
  timeRange?: string;
}

export interface RAGExportOptions {
  format: 'pdf' | 'csv' | 'json' | 'excel';
  includeInsights: boolean;
  includeMetrics: boolean;
  includeJourney: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  customFields?: string[];
}

export interface RAGExportControlsProps {
  investigationId: string;
  availableData: string[];
  onExport: (options: RAGExportOptions) => Promise<void>;
  isExporting?: boolean;
}

export interface RAGComparisonData {
  id: string;
  name: string;
  type: 'before_after' | 'a_b_test' | 'benchmark' | 'historical';
  baselineMetrics: RAGMetrics;
  comparisonMetrics: RAGMetrics;
  improvementPercentage: number;
  significantChanges: {
    metric: string;
    change: number;
    isImprovement: boolean;
  }[];
}

export interface RAGComparisonViewProps {
  investigationId: string;
  comparisons?: RAGComparisonData[];
  selectedComparison?: string;
  onComparisonSelect?: (comparison: RAGComparisonData) => void;
}

export interface RAGHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
  knowledgeBaseFreshness: number;
  systemLoad: number;
  alerts: {
    id: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
  }[];
}

export interface RAGHealthMonitorProps {
  investigationId: string;
  healthStatus?: RAGHealthStatus;
  refreshInterval?: number;
  showAlerts?: boolean;
}
