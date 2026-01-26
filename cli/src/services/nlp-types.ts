/**
 * NLP Client Type Definitions
 */

export interface ParsedIntent {
  intent: string;
  confidence: number;
  params: Record<string, any>;
  requires_confirmation: boolean;
  suggested_command?: string;
}

export interface ToolCall {
  tool: string;
  input: Record<string, any>;
  output: string;
  timestamp: string;
}

export interface PendingAction {
  action_id: string;
  action_type: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AgentExecutionResult {
  success: boolean;
  summary: string;
  tool_calls: ToolCall[];
  total_cost: number;
  iterations: number;
  error?: string;
  session_id?: string;
  session_cost?: number;
  pending_confirmations: PendingAction[];
}

export interface SearchResult {
  content_id: string;
  title: string;
  content_type: string;
  description?: string;
  relevance_score: number;
  match_reason?: string;
}

export interface SearchResults {
  query: string;
  total_found: number;
  results: SearchResult[];
  filter_used: Record<string, any>;
}

export interface VoiceCommandResult {
  transcript: string;
  execution_result: AgentExecutionResult;
  voice_response?: Uint8Array;
}

export interface NlpClientConfig {
  backendUrl?: string;
  timeout?: number;
  apiKey?: string;
}

// Session types

export type ActionMode = 'smart' | 'confirm_all';

export interface CreateSessionOptions {
  platform?: string;
  userId?: string;
  actionMode?: ActionMode;
  metadata?: Record<string, any>;
}

export interface SessionInfo {
  session_id: string;
  platform: string;
  action_mode: string;
  created_at: string;
  expires_at: string;
}

export interface SessionSummary {
  session_id: string;
  platform: string;
  message_count: number;
  total_cost: number;
  total_iterations: number;
  created_at: string;
  last_activity: string;
  pending_actions_count: number;
}

export interface ConfirmActionRequest {
  session_id: string;
  action_id: string;
}

export interface ConfirmActionResult {
  success: boolean;
  action_type: string;
  result: string;
  error?: string;
}

export interface ExecuteAgentOptions {
  query: string;
  platform?: string;
  dryRun?: boolean;
  maxIterations?: number;
  budgetLimit?: number;
  sessionId?: string;
  actionMode?: ActionMode;
}

export interface HealthStatus {
  status: string;
  nlp_enabled: boolean;
  voice_commands_enabled: boolean;
  semantic_search_enabled: boolean;
  anthropic_api_configured: boolean;
  session_ttl_minutes?: number;
  default_action_mode?: string;
}
