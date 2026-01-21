export interface AgentCapability {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  required_permissions: string[];
}

export interface AgentMetrics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_execution_time: number;
  success_rate: number;
  last_execution: string;
  performance_trend: 'improving' | 'stable' | 'declining';
}

export interface AgentResource {
  id: string;
  type: 'cpu' | 'memory' | 'storage' | 'network' | 'api_quota';
  allocated: number;
  used: number;
  unit: string;
  limit?: number;
}

export interface AgentConfiguration {
  timeout_seconds: number;
  max_retries: number;
  retry_delay_seconds: number;
  parallel_execution: boolean;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  environment_variables: Record<string, string>;
  resource_limits: AgentResource[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'active' | 'inactive' | 'maintenance' | 'error' | 'updating';
  type: 'analysis' | 'data_collection' | 'validation' | 'notification' | 'custom';

  // Agent capabilities and configuration
  capabilities: AgentCapability[];
  configuration: AgentConfiguration;

  // Performance and monitoring
  metrics: AgentMetrics;
  health_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  last_health_check: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  tags: string[];

  // Runtime information
  current_load: number;
  queue_size: number;
  is_busy: boolean;
  estimated_wait_time?: number;
}

export interface AgentExecution {
  id: string;
  agent_id: string;
  investigation_id: string;
  step_id: string;

  // Execution details
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  started_at?: string;
  completed_at?: string;
  execution_time?: number;

  // Input/Output data
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error_message?: string;
  error_code?: string;

  // Monitoring
  progress_percentage: number;
  current_operation?: string;
  log_entries: AgentLogEntry[];

  // Resources used during execution
  resources_used: AgentResource[];
}

export interface AgentLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  execution_id: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  agent_type: Agent['type'];
  default_configuration: Partial<AgentConfiguration>;
  required_capabilities: string[];
  supported_input_types: string[];
  output_format: Record<string, any>;
  use_cases: string[];
  documentation_url?: string;
}

export interface CreateAgentRequest {
  name: string;
  description: string;
  type: Agent['type'];
  template_id?: string;
  configuration?: Partial<AgentConfiguration>;
  tags?: string[];
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  status?: Agent['status'];
  configuration?: Partial<AgentConfiguration>;
  tags?: string[];
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface AgentStatsResponse {
  total_agents: number;
  active_agents: number;
  healthy_agents: number;
  total_executions_today: number;
  average_success_rate: number;
  by_status: Record<Agent['status'], number>;
  by_type: Record<Agent['type'], number>;
  performance_summary: {
    fastest_agent: Pick<Agent, 'id' | 'name' | 'metrics'>;
    most_reliable_agent: Pick<Agent, 'id' | 'name' | 'metrics'>;
    busiest_agent: Pick<Agent, 'id' | 'name' | 'current_load'>;
  };
}