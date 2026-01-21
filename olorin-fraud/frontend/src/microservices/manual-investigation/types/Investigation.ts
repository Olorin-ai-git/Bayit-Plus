import { User } from '@/types/User';

export interface InvestigationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  agent_type: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  created_at: string;
  updated_at: string;
  execution_time?: number;
  error_message?: string;
}

export interface InvestigationCollaboration {
  id: string;
  user_id: string;
  user: User;
  message: string;
  created_at: string;
  investigation_id: string;
  reply_to?: string;
  attachments?: string[];
}

export interface InvestigationMetrics {
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  total_execution_time: number;
  average_step_time: number;
  success_rate: number;
}

export interface InvestigationConfig {
  auto_execute: boolean;
  parallel_execution: boolean;
  max_parallel_steps: number;
  timeout_seconds: number;
  retry_failed_steps: boolean;
  max_retries: number;
  notification_settings: {
    email_on_completion: boolean;
    email_on_failure: boolean;
    slack_notifications: boolean;
  };
}

export interface Investigation {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_by: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;

  // Core investigation data
  entity_id: string;
  entity_type: 'user' | 'transaction' | 'device' | 'session' | 'custom';

  // Investigation workflow
  steps: InvestigationStep[];
  current_step_index: number;

  // Collaboration and tracking
  collaboration: InvestigationCollaboration[];
  metrics: InvestigationMetrics;
  config: InvestigationConfig;

  // Results and findings
  risk_score?: number;
  findings: Record<string, any>;
  evidence: any[];
  recommendations: string[];

  // Metadata
  tags: string[];
  source: 'manual' | 'automated' | 'api' | 'scheduled';
  parent_investigation_id?: string;
  related_investigations: string[];
}

export interface CreateInvestigationRequest {
  name: string;
  description: string;
  entity_id: string;
  entity_type: Investigation['entity_type'];
  priority: Investigation['priority'];
  assigned_to?: string;
  config?: Partial<InvestigationConfig>;
  tags?: string[];
  source?: Investigation['source'];
}

export interface UpdateInvestigationRequest {
  name?: string;
  description?: string;
  status?: Investigation['status'];
  priority?: Investigation['priority'];
  assigned_to?: string;
  config?: Partial<InvestigationConfig>;
  tags?: string[];
}

export interface InvestigationListResponse {
  investigations: Investigation[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface InvestigationStatsResponse {
  total_investigations: number;
  active_investigations: number;
  completed_today: number;
  average_completion_time: number;
  success_rate: number;
  by_status: Record<Investigation['status'], number>;
  by_priority: Record<Investigation['priority'], number>;
  recent_activity: Investigation[];
}