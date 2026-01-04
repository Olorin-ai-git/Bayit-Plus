/**
 * Event Types for Microservices Communication
 *
 * Defines event bus and WebSocket event schemas for cross-service communication
 */

import type { Investigation, AgentExecution, Report } from './index';

/**
 * Investigation-related events
 */
export interface InvestigationStartedEvent {
  investigation: Investigation;
}

export interface InvestigationUpdatedEvent {
  investigationId: string;
  updates: Partial<Investigation>;
}

export interface InvestigationCompletedEvent {
  investigationId: string;
  results: InvestigationResults;
}

export interface InvestigationResults {
  investigationId: string;
  riskScore: number;
  findings: any[];
  summary: string;
  recommendations: string[];
  completedAt: Date;
}

/**
 * Agent execution events
 */
export interface AgentExecutionStartedEvent {
  execution: AgentExecution;
}

export interface AgentExecutionProgressEvent {
  executionId: string;
  progress: number; // 0-100
}

export interface AgentExecutionCompletedEvent {
  executionId: string;
  results: any;
}

export interface AgentLogEvent {
  executionId: string;
  log: {
    timestamp: Date;
    level: 'info' | 'warning' | 'error' | 'debug';
    message: string;
    data?: any;
  };
}

/**
 * RAG Intelligence events
 */
export interface RAGQueryStartedEvent {
  sessionId: string;
  query: RAGQuery;
}

export interface RAGQueryResult {
  sessionId: string;
  queryId: string;
  results: any[];
}

export interface RAGInsightGeneratedEvent {
  sessionId: string;
  insight: RAGInsight;
}

export interface RAGInsightUpdate {
  sessionId: string;
  insight: RAGInsight;
}

export interface RAGAnalyticsUpdatedEvent {
  sessionId: string;
  analytics: Partial<RAGAnalytics>;
}

export interface RAGQuery {
  id: string;
  text: string;
  context: string[];
  timestamp: Date;
}

export interface RAGInsight {
  id: string;
  title: string;
  content: string;
  relevance: number;
  timestamp: Date;
}

export interface RAGAnalytics {
  totalQueries: number;
  successRate: number;
  averageResponseTime: number;
  sourceUtilization: Record<string, number>;
  domainCoverage: Record<string, number>;
}

/**
 * Visualization events
 */
export interface VizDataLoadedEvent {
  investigationId: string;
  data: VisualizationData;
}

export interface VizSelectionChangedEvent {
  nodeIds: string[];
  edgeIds: string[];
}

export interface VisualizationData {
  investigationId: string;
  type: 'graph' | 'map' | 'chart' | 'neural_network';
  nodes: any[];
  edges: any[];
  layout: any;
  filters: any;
}

/**
 * Report events
 */
export interface ReportGenerationStartedEvent {
  reportId: string;
}

export interface ReportGenerationCompletedEvent {
  reportId: string;
  report: Report;
}

export interface ReportGenerationFailedEvent {
  reportId: string;
  error: string;
}

/**
 * UI events
 */
export interface UINavigationEvent {
  path: string;
  params?: Record<string, any>;
}

export interface UINotificationEvent {
  notification: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
  };
}

export interface UIThemeChangedEvent {
  theme: {
    mode: 'light' | 'dark';
    primaryColor: string;
    customizations: Record<string, any>;
  };
}

/**
 * @deprecated Use EventMap from UnifiedEventBus instead
 * This interface is kept only for backward compatibility
 * EventMap in src/shared/events/UnifiedEventBus.tsx is the canonical event type system
 *
 * Event bus schema - all events that can be published to the event bus
 */
export interface EventBusEvents {
  // Investigation events
  'investigation:started': InvestigationStartedEvent;
  'investigation:updated': InvestigationUpdatedEvent;
  'investigation:completed': InvestigationCompletedEvent;

  // Agent events
  'agent:execution:started': AgentExecutionStartedEvent;
  'agent:execution:progress': AgentExecutionProgressEvent;
  'agent:execution:completed': AgentExecutionCompletedEvent;
  'agent:log': AgentLogEvent;

  // RAG events
  'rag:query:started': RAGQueryStartedEvent;
  'rag:insight:generated': RAGInsightGeneratedEvent;
  'rag:analytics:updated': RAGAnalyticsUpdatedEvent;

  // Visualization events
  'viz:data:loaded': VizDataLoadedEvent;
  'viz:selection:changed': VizSelectionChangedEvent;

  // Report events
  'report:generation:started': ReportGenerationStartedEvent;
  'report:generation:completed': ReportGenerationCompletedEvent;
  'report:generation:failed': ReportGenerationFailedEvent;

  // UI events
  'ui:navigation': UINavigationEvent;
  'ui:notification': UINotificationEvent;
  'ui:theme:changed': UIThemeChangedEvent;
}

/**
 * WebSocket events - real-time updates from backend
 */
export interface WebSocketEvents {
  // Investigation updates
  investigation_progress: InvestigationProgressUpdate;
  investigation_completed: InvestigationCompletedEvent;

  // Agent updates
  agent_log: AgentLogUpdate;
  agent_status: AgentStatusUpdate;

  // RAG updates
  rag_query_result: RAGQueryResult;
  rag_insight: RAGInsightUpdate;

  // System updates
  system_status: SystemStatus;
  error: ErrorEvent;
}

export interface InvestigationProgressUpdate {
  investigationId: string;
  progress: number;
  currentPhase: string;
  message: string;
  timestamp: Date;
}

export interface AgentLogUpdate {
  executionId: string;
  log: {
    timestamp: Date;
    level: 'info' | 'warning' | 'error' | 'debug';
    message: string;
    data?: any;
  };
}

export interface AgentStatusUpdate {
  agentId: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  timestamp: Date;
  message?: string;
}

export interface SystemStatus {
  healthy: boolean;
  services: Record<string, ServiceHealth>;
  timestamp: Date;
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency: number;
  lastCheck: Date;
}

export interface ErrorEvent {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}
