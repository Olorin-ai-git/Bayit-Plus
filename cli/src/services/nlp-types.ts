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

export interface AgentExecutionResult {
  success: boolean;
  summary: string;
  tool_calls: ToolCall[];
  total_cost: number;
  iterations: number;
  error?: string;
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
