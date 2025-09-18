/**
 * Shared Types for Olorin Microservices
 * Common type definitions used across all microservices
 */

// Base Entity Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// User and Authentication Types
export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
}

export type UserRole = 'admin' | 'investigator' | 'analyst' | 'viewer';

export interface Permission {
  id: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

// Investigation Types
export interface Investigation extends BaseEntity {
  title: string;
  description: string;
  entityType: EntityType;
  entityValue: string;
  status: InvestigationStatus;
  priority: Priority;
  assignedTo?: string;
  riskScore?: number;
  tags: string[];
  metadata: Record<string, any>;
}

export type EntityType = 'user_id' | 'email' | 'phone' | 'device_id' | 'ip_address';
export type InvestigationStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

// WebSocket Types
export type ServiceName =
  | 'shell'
  | 'autonomous-investigation'
  | 'manual-investigation'
  | 'agent-analytics'
  | 'rag-intelligence'
  | 'visualization'
  | 'reporting'
  | 'core-ui'
  | 'design-system'
  | 'broadcast';

export type WebSocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectEnabled?: boolean;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  debug?: boolean;
}

export interface WebSocketMessage {
  id?: string;
  type: string;
  event?: string;
  data?: any;
  target?: ServiceName;
  source?: ServiceName;
  timestamp?: string;
}

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface WebSocketSubscription {
  id: string;
  eventType: string;
  handler: (data: any) => void;
  service?: ServiceName;
  once: boolean;
  createdAt: Date;
}

// Autonomous Investigation Types
export interface AutonomousInvestigation extends Investigation {
  aiMode: AIMode;
  escalationReason?: string;
  agentDecisions: AIDecision[];
  automatedActions: AutomatedAction[];
}

export type AIMode = 'conservative' | 'balanced' | 'aggressive';

export interface AIDecision {
  id: string;
  timestamp: Date;
  decision: 'continue' | 'escalate' | 'complete';
  confidence: number;
  reasoning: string;
  context: Record<string, any>;
}

export interface AutomatedAction {
  id: string;
  type: string;
  timestamp: Date;
  parameters: Record<string, any>;
  result: any;
  duration: number;
}

// Manual Investigation Types
export interface ManualInvestigation extends Investigation {
  workflow: WorkflowStep[];
  evidence: Evidence[];
  collaborators: Collaborator[];
  notes: InvestigationNote[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  result?: any;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  data: any;
  source: string;
  timestamp: Date;
  addedBy: string;
  verified: boolean;
}

export type EvidenceType = 'document' | 'screenshot' | 'log' | 'transaction' | 'communication' | 'other';

export interface Collaborator {
  userId: string;
  role: CollaboratorRole;
  permissions: string[];
  joinedAt: Date;
  invitedBy: string;
}

export type CollaboratorRole = 'lead' | 'investigator' | 'reviewer' | 'observer';

export interface InvestigationNote {
  id: string;
  content: string;
  authorId: string;
  timestamp: Date;
  isPrivate: boolean;
  mentions: string[];
}

// Analytics and Metrics Types
export interface AgentMetrics extends BaseEntity {
  agentId: string;
  agentType: string;
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  lastExecution?: Date;
  performanceData: PerformanceData;
}

export interface PerformanceData {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  throughput: number;
  errorCount: number;
  warningCount: number;
}

export interface AgentExecution extends BaseEntity {
  agentId: string;
  investigationId?: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input: any;
  output?: any;
  error?: string;
}

export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

// RAG Intelligence Types
export interface RAGQuery extends BaseEntity {
  query: string;
  context: string[];
  results: RAGResult[];
  confidence: number;
  sources: string[];
  metadata: Record<string, any>;
}

export interface RAGResult {
  id: string;
  content: string;
  relevance: number;
  source: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface KnowledgeSource extends BaseEntity {
  name: string;
  type: SourceType;
  url?: string;
  description: string;
  isActive: boolean;
  lastSynced?: Date;
  documentCount: number;
}

export type SourceType = 'database' | 'api' | 'file' | 'web' | 'manual';

// Visualization Types
export interface VisualizationConfig {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  dataSource: string;
  configuration: ChartConfiguration;
  filters: Filter[];
  dimensions: Dimension[];
}

export type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'network' | 'timeline' | 'map';

export interface ChartConfiguration {
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  colors: string[];
  animation: boolean;
  responsive: boolean;
  legend: LegendConfig;
}

export interface AxisConfig {
  field: string;
  label: string;
  type: 'categorical' | 'numerical' | 'temporal';
  format?: string;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
  label: string;
}

export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';

export interface Dimension {
  field: string;
  label: string;
  aggregation?: AggregationType;
}

export type AggregationType = 'sum' | 'average' | 'count' | 'min' | 'max' | 'distinct';

// Reporting Types
export interface Report extends BaseEntity {
  title: string;
  description: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  parameters: ReportParameter[];
  schedule?: ReportSchedule;
  generatedAt?: Date;
  filePath?: string;
  size?: number;
}

export type ReportType = 'investigation' | 'analytics' | 'performance' | 'audit' | 'summary';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface ReportParameter {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface ReportSchedule {
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  minute: number;
  timezone: string;
  isActive: boolean;
}

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// UI and Design System Types
export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  customizations: Record<string, any>;
}

export interface ComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  testId?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
  timestamp: Date;
  isRead: boolean;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

// Event and Message Types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
  correlationId?: string;
}

export interface ServiceMessage {
  from: string;
  to: string;
  type: string;
  data: any;
  timestamp: Date;
  id: string;
}

// API Response Types
export interface APIResponse<T = any> {
  data: T;
  status: number;
  message: string;
  timestamp: string;
  errors?: APIError[];
}

export interface APIError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Configuration Types
export interface ServiceConfig {
  name: string;
  port: number;
  baseURL: string;
  healthEndpoint: string;
  timeout: number;
  retries: number;
  rateLimiting?: RateLimitConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Export all types as a namespace for convenience
export namespace OlorinTypes {
  export type TUser = User;
  export type TInvestigation = Investigation;
  export type TAutonomousInvestigation = AutonomousInvestigation;
  export type TManualInvestigation = ManualInvestigation;
  export type TAgentMetrics = AgentMetrics;
  export type TRAGQuery = RAGQuery;
  export type TVisualizationConfig = VisualizationConfig;
  export type TReport = Report;
  export type TTheme = Theme;
  export type TNotification = Notification;
  export type TAPIResponse<T = any> = APIResponse<T>;
  export type TPaginatedResponse<T> = PaginatedResponse<T>;
}

export default OlorinTypes;