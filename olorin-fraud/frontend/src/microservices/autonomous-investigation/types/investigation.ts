export type InvestigationStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'stopped'
  | 'cancelled';

export type InvestigationPriority = 'low' | 'medium' | 'high' | 'critical';

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  type: 'device' | 'location' | 'network' | 'behavior' | 'transaction' | 'logs';
  version: string;
  enabled: boolean;
  configuration: Record<string, any>;
  capabilities: string[];
  requiredInputs: string[];
  outputFormat: string;
}

export interface AgentConfiguration {
  id: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface AgentProgress {
  agentId: string;
  progress: number; // 0-100
  status: AgentStatus;
  message: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  artifacts?: AgentArtifact[];
}

export interface AgentArtifact {
  id: string;
  type: 'log' | 'chart' | 'table' | 'image' | 'document';
  title: string;
  description?: string;
  data: any;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface InvestigationProgress {
  overall: number; // 0-100
  agents: AgentProgress[];
  startedAt?: string;
  estimatedCompletion?: string;
  currentPhase?: string;
}

export interface InvestigationConfiguration {
  agents: AgentConfiguration[];
  parameters: {
    timeRange?: string;
    threshold?: number;
    includeHistorical?: boolean;
    maxDuration?: number;
    parallelAgents?: boolean;
    [key: string]: any;
  };
  notifications?: {
    onProgress?: boolean;
    onCompletion?: boolean;
    onError?: boolean;
    webhookUrl?: string;
  };
}

export interface InvestigationResults {
  summary: string;
  riskScore: number;
  confidence: number;
  findings: string[];
  recommendations: string[];
  agentResults: AgentResult[];
  artifacts: AgentArtifact[];
  timeline: InvestigationEvent[];
}

export interface AgentResult {
  agentId: string;
  status: AgentStatus;
  score: number;
  confidence: number;
  findings: string[];
  evidence: Evidence[];
  executionTime: number;
  resourceUsage?: {
    cpu: number;
    memory: number;
    duration: number;
  };
}

export interface Evidence {
  id: string;
  type: 'anomaly' | 'pattern' | 'correlation' | 'rule_match' | 'threshold_breach';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  timestamp: string;
  data: any;
  context?: Record<string, any>;
}

export interface InvestigationEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'started' | 'agent_started' | 'agent_completed' | 'agent_failed' | 'paused' | 'resumed' | 'completed' | 'failed';
  actor: 'user' | 'system' | 'agent';
  description: string;
  metadata?: Record<string, any>;
}

export interface Investigation {
  id: string;
  title: string;
  description: string;
  type: 'autonomous' | 'manual';
  status: InvestigationStatus;
  priority: InvestigationPriority;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;

  // Ownership
  createdBy: string;
  assignedTo?: string;
  assignedAgents: string[];

  // Configuration
  configuration: InvestigationConfiguration;

  // Progress and Results
  progress: InvestigationProgress;
  results?: InvestigationResults;

  // Error handling
  error?: string;
  retryCount?: number;

  // Metadata
  metadata: Record<string, any>;
  tags?: string[];

  // Related investigations
  parentInvestigationId?: string;
  childInvestigationIds?: string[];
}

export interface InvestigationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  configuration: InvestigationConfiguration;
  metadata: Record<string, any>;
  isDefault?: boolean;
  createdBy: string;
  createdAt: string;
}

export interface InvestigationMetrics {
  total: number;
  byStatus: Record<InvestigationStatus, number>;
  byPriority: Record<InvestigationPriority, number>;
  averageExecutionTime: number;
  successRate: number;
  topAgents: { agentId: string; usage: number }[];
  recentActivity: InvestigationEvent[];
}

// API Response types
export interface InvestigationListResponse {
  investigations: Investigation[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CreateInvestigationRequest {
  title: string;
  description: string;
  priority: InvestigationPriority;
  configuration: InvestigationConfiguration;
  metadata?: Record<string, any>;
  tags?: string[];
  templateId?: string;
}

export interface UpdateInvestigationRequest {
  title?: string;
  description?: string;
  priority?: InvestigationPriority;
  status?: InvestigationStatus;
  configuration?: Partial<InvestigationConfiguration>;
  metadata?: Record<string, any>;
  tags?: string[];
}

// Filter and search types
export interface InvestigationFilters {
  status?: InvestigationStatus[];
  priority?: InvestigationPriority[];
  createdBy?: string[];
  assignedTo?: string[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  agents?: string[];
}

export interface InvestigationSearchParams {
  query?: string;
  filters?: InvestigationFilters;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Investigation Step Types
export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

export interface InvestigationStep {
  id: string;
  title: string;
  description: string;
  agent: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  details?: any;
  error?: string;
  order: number;
  dependencies?: string[];
  required: boolean;
  parameters?: Record<string, any>;
}

// Entity Types for Investigation
export type EntityType = 'userId' | 'deviceId';

export interface InvestigationEntityParams {
  entityId: string;
  entityType: EntityType;
  timeRange: string;
}

// Log Entry Types
export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: LogLevel;
  agentName?: string;
  stepId?: string;
  investigationId?: string;
}