/**
 * Hybrid Graph Investigation Types
 * Feature: 006-hybrid-graph-integration
 *
 * TypeScript interfaces matching backend Pydantic schemas for hybrid graph investigations.
 * Maps to: investigation_config.py, investigation_status.py, investigation_results.py
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven: No hardcoded values
 * - Complete implementation: No placeholders or TODOs
 * - Type-safe: Strict TypeScript interfaces matching backend contracts
 */

/** Entity types supported by hybrid graph investigations */
export type EntityType = "user" | "device" | "ip" | "transaction";

/** Investigation lifecycle status */
export type InvestigationLifecycleStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "timeout";

/** Agent execution status */
export type AgentExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

/** Tool execution status */
export type ToolStatus = "pending" | "running" | "completed" | "failed";

/** Log severity levels */
export type LogSeverity = "info" | "warning" | "error";

/** Finding severity levels */
export type FindingSeverity = "critical" | "high" | "medium" | "low";

/** Domain agent types */
export type DomainAgent = "device" | "location" | "network" | "logs" | "risk";

/** Correlation modes for multi-entity investigations */
export type CorrelationMode = "OR" | "AND";

/** Execution modes for tool execution */
export type ExecutionMode = "parallel" | "sequential";

/** Time range for investigation data collection */
export interface TimeRange {
  start: string; // ISO 8601 datetime
  end: string; // ISO 8601 datetime
}

/** Tool configuration for investigation */
export interface ToolConfig {
  tool_id: string;
  enabled: boolean;
  parameters?: Record<string, unknown>;
}

/**
 * Investigation Configuration (T010)
 * Maps to: InvestigationConfigSchema (backend)
 * Used in: POST /api/investigations request
 */
export interface InvestigationConfig {
  entity_type: EntityType;
  entity_id: string;
  time_range: TimeRange;
  tools: ToolConfig[];
  correlation_mode?: CorrelationMode;
  execution_mode?: ExecutionMode;
  risk_threshold?: number; // 0-100
}

/** Agent status details for polling */
export interface AgentStatus {
  agent_name: string;
  status: AgentExecutionStatus;
  progress_percentage: number; // 0-100
  tools_used: number;
  findings_count: number;
  execution_time_ms?: number;
}

/** Tool execution tracking */
export interface ToolExecution {
  tool_id: string;
  tool_name: string;
  status: ToolStatus;
  started_at: string; // ISO 8601 datetime
  completed_at?: string; // ISO 8601 datetime
  duration_ms?: number;
  output_summary: string;
  error_message?: string;
}

/** Log entry from investigation execution */
export interface LogEntry {
  timestamp: string; // ISO 8601 datetime
  severity: LogSeverity;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/** Error details for failed investigations */
export interface ErrorDetail {
  error_code: string;
  error_message: string;
  error_details?: string;
  recovery_suggestions: string[];
}

/**
 * Investigation Status (T011)
 * Maps to: InvestigationStatusSchema (backend)
 * Used in: GET /api/investigations/{id}/status response
 */
export interface InvestigationStatus {
  investigation_id: string;
  status: InvestigationLifecycleStatus;
  current_phase: string;
  progress_percentage: number; // 0-100
  estimated_completion_time?: string; // ISO 8601 datetime
  risk_score?: number; // 0-100
  agent_status: Record<string, AgentStatus>;
  tool_executions: ToolExecution[];
  logs: LogEntry[];
  error?: ErrorDetail;
}

/** Individual finding from investigation */
export interface Finding {
  finding_id: string;
  severity: FindingSeverity;
  domain: DomainAgent;
  title: string;
  description: string;
  affected_entities: string[];
  evidence_ids: string[];
  confidence_score: number; // 0-1
  timestamp: string; // ISO 8601 datetime
  metadata?: Record<string, unknown>;
}

/** Evidence supporting investigation findings */
export interface Evidence {
  evidence_id: string;
  source: string;
  evidence_type: string;
  data: Record<string, unknown>;
  timestamp: string; // ISO 8601 datetime
  confidence_score: number; // 0-1
  related_findings: string[];
}

/** Agent decision made during investigation */
export interface AgentDecision {
  agent_name: string;
  decision: string;
  rationale: string;
  confidence_score: number; // 0-1
  supporting_evidence: string[];
  alternative_hypotheses: string[];
  timestamp: string; // ISO 8601 datetime
}

/** Investigation execution metadata */
export interface InvestigationMetadata {
  entity_type: string;
  entity_id: string;
  time_range: { start: string; end: string };
  tools_used: string[];
  execution_mode: string;
  correlation_mode: string;
}

/**
 * Investigation Results (T012)
 * Maps to: InvestigationResultsSchema (backend)
 * Used in: GET /api/investigations/{id}/results response
 */
export interface InvestigationResults {
  investigation_id: string;
  overall_risk_score: number; // 0-100
  status: "completed" | "failed";
  started_at: string; // ISO 8601 datetime
  completed_at: string; // ISO 8601 datetime
  duration_ms: number;
  findings: Finding[];
  evidence: Evidence[];
  agent_decisions: AgentDecision[];
  summary: string;
  metadata: InvestigationMetadata;
}
