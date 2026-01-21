/**
 * Common Types - Shared across all services
 *
 * Contains base types and utilities used throughout the application
 */

/**
 * Standard pagination state for list views
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Generic filter configuration
 */
export interface FilterConfig {
  [key: string]: any;
}

/**
 * Layout configuration for visualizations
 */
export interface LayoutConfig {
  type: 'force' | 'hierarchical' | 'circular' | 'grid';
  spacing?: number;
  orientation?: 'horizontal' | 'vertical';
  [key: string]: any;
}

/**
 * Evidence data structure
 */
export interface Evidence {
  id: string;
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  reliability: number; // 0-1
}

/**
 * Generic result type
 */
export interface Result<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

/**
 * Log severity levels
 */
export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

/**
 * Status types used across services
 */
export type EntityStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed';
export type SessionStatus = 'active' | 'paused' | 'completed';

/**
 * Severity levels for findings
 */
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Entity types for investigations
 */
export type EntityType = 'user_id' | 'email' | 'phone' | 'device_id';

/**
 * Investigation types
 */
export type InvestigationType = 'manual' | 'structured';

/**
 * Category types for findings
 */
export type FindingCategory = 'device' | 'location' | 'network' | 'behavior';

/**
 * Agent types
 */
export type AgentType = 'device' | 'location' | 'network' | 'logs' | 'rag';

/**
 * Node types for visualizations
 */
export type NodeType = 'user' | 'device' | 'location' | 'transaction' | 'event';

/**
 * Edge types for visualizations
 */
export type EdgeType = 'connection' | 'transaction' | 'communication' | 'correlation';

/**
 * Report types
 */
export type ReportType = 'summary' | 'detailed' | 'executive' | 'technical';

/**
 * Report formats
 */
export type ReportFormat = 'pdf' | 'html' | 'json';

/**
 * Report section types
 */
export type ReportSectionType = 'text' | 'chart' | 'table' | 'image';

/**
 * RAG source types
 */
export type RAGSourceType = 'database' | 'document' | 'api' | 'knowledge_base';

/**
 * Visualization types
 */
export type VisualizationType = 'graph' | 'map' | 'chart' | 'neural_network';

/**
 * View modes for visualization
 */
export type ViewMode = 'graph' | 'map' | 'neural' | 'chart';
