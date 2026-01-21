import { Agent } from './Agent';

export interface StepValidation {
  rule: string;
  description: string;
  required: boolean;
  validator_function?: string;
  error_message?: string;
}

export interface StepDependency {
  step_id: string;
  condition: 'completed' | 'succeeded' | 'failed' | 'any';
  required_outputs?: string[];
}

export interface StepInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file';
  description: string;
  required: boolean;
  default_value?: any;
  validation: StepValidation[];
  source?: 'user_input' | 'previous_step' | 'investigation_data' | 'external_api';
  source_reference?: string;
}

export interface StepOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file';
  description: string;
  value?: any;
  confidence_score?: number;
  metadata?: Record<string, any>;
}

export interface StepExecutionContext {
  investigation_id: string;
  user_id: string;
  execution_environment: 'local' | 'cloud' | 'hybrid';
  resource_allocation: {
    cpu_cores: number;
    memory_mb: number;
    timeout_seconds: number;
  };
  security_context: {
    permissions: string[];
    data_access_level: 'read' | 'write' | 'admin';
    audit_required: boolean;
  };
}

export interface StepTemplate {
  id: string;
  name: string;
  description: string;
  category: 'data_collection' | 'analysis' | 'validation' | 'notification' | 'custom';
  agent_type: string;
  version: string;

  // Template configuration
  inputs: StepInput[];
  outputs: StepOutput[];
  dependencies: StepDependency[];
  estimated_duration: number;
  complexity_level: 'low' | 'medium' | 'high';

  // Documentation and help
  documentation: string;
  examples: Array<{
    name: string;
    description: string;
    sample_inputs: Record<string, any>;
    expected_outputs: Record<string, any>;
  }>;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  tags: string[];
  is_public: boolean;
}

export interface Step {
  id: string;
  name: string;
  description: string;
  investigation_id: string;

  // Step configuration
  template_id?: string;
  agent_id: string;
  agent: Agent;
  order_index: number;

  // Execution details
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  inputs: Record<string, any>;
  outputs: Record<string, any>;

  // Dependencies and validation
  dependencies: StepDependency[];
  validation_results: Array<{
    rule: string;
    passed: boolean;
    message?: string;
  }>;

  // Timing and performance
  created_at: string;
  started_at?: string;
  completed_at?: string;
  execution_time?: number;
  estimated_duration?: number;

  // Error handling
  error_message?: string;
  error_code?: string;
  retry_count: number;
  max_retries: number;

  // Progress tracking
  progress_percentage: number;
  current_operation?: string;

  // Metadata and context
  execution_context: StepExecutionContext;
  notes?: string;
  tags: string[];

  // Results and quality
  confidence_score?: number;
  quality_score?: number;
  review_required: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface StepExecution {
  id: string;
  step_id: string;
  attempt_number: number;

  // Execution tracking
  status: Step['status'];
  started_at: string;
  completed_at?: string;
  execution_time?: number;

  // Resource usage
  resources_used: {
    cpu_time_ms: number;
    memory_peak_mb: number;
    network_bytes: number;
    storage_bytes: number;
  };

  // Logs and monitoring
  log_entries: Array<{
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, any>;
  }>;

  // Results
  outputs: Record<string, any>;
  error_details?: {
    code: string;
    message: string;
    stack_trace?: string;
    context: Record<string, any>;
  };
}

export interface CreateStepRequest {
  name: string;
  description: string;
  investigation_id: string;
  template_id?: string;
  agent_id: string;
  order_index: number;
  inputs: Record<string, any>;
  dependencies?: StepDependency[];
  notes?: string;
  tags?: string[];
}

export interface UpdateStepRequest {
  name?: string;
  description?: string;
  inputs?: Record<string, any>;
  order_index?: number;
  notes?: string;
  tags?: string[];
}

export interface ExecuteStepRequest {
  override_inputs?: Record<string, any>;
  force_execution?: boolean;
  priority?: 'low' | 'normal' | 'high';
  execution_context?: Partial<StepExecutionContext>;
}

export interface StepListResponse {
  steps: Step[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface StepTemplateListResponse {
  templates: StepTemplate[];
  total: number;
  page: number;
  per_page: number;
  categories: string[];
  tags: string[];
}