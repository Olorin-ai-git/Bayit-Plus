export interface InvestigationSnapshot {
  id: string;
  status: string;
  lifecycle_stage: string;
  completion_percent: number;
  version?: number;
  settings?: Record<string, unknown>;
  findings?: Record<string, unknown>;
}

export interface ProgressData {
  status: string;
  lifecycle_stage: string;
  completion_percent: number;
  updated_at: string;
  phase_name?: string;
}

export interface EventData {
  event_id: string;
  timestamp: string;
  sequence: number;
  type: string;
  data: Record<string, unknown>;
  investigation_id: string;
}

export interface EventsResponse {
  items: EventData[];
  next_cursor?: string;
  server_time: string;
}

export interface InvestigationLogs {
  investigation_id: string;
  logs: Array<{
    timestamp: string;
    sequence: number;
    event_type: string;
    severity: string;
    message: string;
    data?: Record<string, unknown>;
  }>;
  summary: {
    total_events: number;
    first_event_time: string;
    last_event_time: string;
  };
}

export interface LLMInteractionLog {
  timestamp: string;
  agent_name: string;
  model_name: string;
  full_prompt?: string;
  response: string;
  tokens_used?: number;
  confidence_score?: number;
  response_time_ms: number;
}

export interface ToolExecutionLog {
  timestamp: string;
  tool_name: string;
  tool_parameters: Record<string, unknown>;
  selection_reasoning: string;
  execution_result: string;
  success: boolean;
  error_message?: string;
  execution_time_ms: number;
}

export interface AgentDecisionLog {
  timestamp: string;
  decision_type: string;
  context: string;
  reasoning: string;
  decision_outcome: string;
  confidence_score?: number;
  alternatives?: string[];
  execution_time_ms: number;
}

export interface ErrorLog {
  timestamp: string;
  error_type: string;
  message: string;
  context?: string;
  stack?: string;
}

export interface ParsedInvestigationLogs {
  investigationId: string;
  llmInteractions: LLMInteractionLog[];
  toolExecutions: ToolExecutionLog[];
  agentDecisions: AgentDecisionLog[];
  errors: ErrorLog[];
  rawLogs: InvestigationLogs;
}

export interface AssertionResult {
  passed: boolean;
  violations: string[];
  details?: Record<string, unknown>;
}

export interface ApiConfig {
  baseUrl: string;
  backendBaseUrl: string;
  timeoutMs: number;
}
