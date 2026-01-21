// Core entity types
export type {
  Investigation,
  InvestigationStep,
  InvestigationCollaboration,
  InvestigationMetrics,
  InvestigationConfig,
  CreateInvestigationRequest,
  UpdateInvestigationRequest,
  InvestigationListResponse,
  InvestigationStatsResponse
} from './Investigation';

export type {
  Agent,
  AgentCapability,
  AgentMetrics,
  AgentResource,
  AgentConfiguration,
  AgentExecution,
  AgentLogEntry,
  AgentTemplate,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentListResponse,
  AgentStatsResponse
} from './Agent';

export type {
  Step,
  StepValidation,
  StepDependency,
  StepInput,
  StepOutput,
  StepExecutionContext,
  StepTemplate,
  StepExecution,
  CreateStepRequest,
  UpdateStepRequest,
  ExecuteStepRequest,
  StepListResponse,
  StepTemplateListResponse
} from './Step';

export type {
  Report,
  ReportSection,
  ReportChart,
  ReportAttachment,
  ReportConfiguration,
  ReportTemplate,
  ReportGenerationJob,
  CreateReportRequest,
  UpdateReportRequest,
  GenerateReportRequest,
  ShareReportRequest,
  ReportListResponse,
  ReportTemplateListResponse,
  ReportStatsResponse
} from './Report';

export type {
  Collaboration,
  CollaborationAttachment,
  CollaborationMention,
  CollaborationReaction,
  CollaborationThread,
  CollaborationNotification,
  CollaborationActivity,
  CollaborationSettings,
  CreateCollaborationRequest,
  UpdateCollaborationRequest,
  CreateThreadRequest,
  UpdateThreadRequest,
  AddReactionRequest,
  CollaborationListResponse,
  CollaborationStatsResponse,
  NotificationListResponse
} from './Collaboration';

// Re-export shared types that are commonly used
// TODO: Fix User type import path for Module Federation
// export type {
//   User
// } from '@/types/User';

// Common utility types for the manual investigation service
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    timestamp: string;
    request_id: string;
    version: string;
  };
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string[];
  priority?: string[];
  created_after?: string;
  created_before?: string;
  assigned_to?: string[];
  tags?: string[];
}

export interface WebSocketMessage<T = any> {
  type: string;
  event: string;
  data: T;
  timestamp: string;
  investigation_id?: string;
  user_id?: string;
}

export interface ServiceError {
  name: string;
  message: string;
  code: string;
  status: number;
  context?: Record<string, any>;
}

// Event types for the manual investigation service
export interface InvestigationEvent {
  type: 'investigation.created' | 'investigation.updated' | 'investigation.deleted' |
        'investigation.status_changed' | 'investigation.assigned' | 'investigation.completed';
  investigation_id: string;
  data: Record<string, any>;
  user_id: string;
  timestamp: string;
}

export interface StepEvent {
  type: 'step.created' | 'step.updated' | 'step.deleted' | 'step.executed' |
        'step.completed' | 'step.failed' | 'step.retried';
  investigation_id: string;
  step_id: string;
  data: Record<string, any>;
  user_id: string;
  timestamp: string;
}

export interface CollaborationEvent {
  type: 'collaboration.comment_added' | 'collaboration.comment_updated' |
        'collaboration.comment_deleted' | 'collaboration.thread_created' |
        'collaboration.thread_resolved' | 'collaboration.mention_added';
  investigation_id: string;
  collaboration_id: string;
  data: Record<string, any>;
  user_id: string;
  timestamp: string;
}

export interface ReportEvent {
  type: 'report.created' | 'report.updated' | 'report.generated' |
        'report.shared' | 'report.published' | 'report.archived';
  investigation_id: string;
  report_id: string;
  data: Record<string, any>;
  user_id: string;
  timestamp: string;
}

// Union type for all event types
export type ServiceEvent = InvestigationEvent | StepEvent | CollaborationEvent | ReportEvent;

// Service configuration types
export interface ServiceConfig {
  api_base_url: string;
  websocket_url: string;
  timeout_ms: number;
  retry_attempts: number;
  retry_delay_ms: number;
  enable_real_time: boolean;
  debug_mode: boolean;
}

// Component props interfaces commonly used across the service
export interface BaseComponentProps {
  className?: string;
  testId?: string;
  loading?: boolean;
  error?: ServiceError | null;
  onError?: (error: ServiceError) => void;
}

export interface DataTableProps<T> extends BaseComponentProps {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    sortable?: boolean;
    render?: (value: any, record: T) => React.ReactNode;
  }>;
  pagination?: PaginationParams;
  onPaginationChange?: (params: PaginationParams) => void;
  onSort?: (key: keyof T, order: 'asc' | 'desc') => void;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export interface FormFieldProps extends BaseComponentProps {
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}