/**
 * Agent Tool Types for Hybrid Graph Investigation UI
 *
 * This module defines tool-specific data models including agent tools,
 * performance metrics, telemetry, and tool monitoring types.
 *
 * @author Gil Klainert
 * @created 2025-01-21
 */

import type { DomainType, Severity, ApiResponse } from './investigation.types';
import type { ToolType, HealthStatus } from './ui.types';

// ============================================================================
// Agent Tool Interface
// ============================================================================

/**
 * Agent tool interface for Command Center
 */
export interface AgentTool {
  /** Core identification */
  name: string;                 // Tool name (e.g., "snowflake_query")
  type: ToolType;
  version: string;              // Tool version for reproducibility

  /** Execution statistics */
  calls: number;                // Number of times called
  duration_ms: number;          // Total execution time
  avg_duration_ms: number;      // Average execution time

  /** Health and performance */
  success_rate: number;         // 0-1 success rate
  errors: ToolError[];          // Recent errors
  last_execution: string;       // ISO 8601 timestamp
  health_status: HealthStatus;

  /** Configuration */
  configuration: Record<string, unknown>; // Tool-specific config
  dependencies: string[];       // Other tools this depends on

  /** Investigation context */
  investigation_id: string;
  domain: DomainType;           // Which domain this tool serves

  /** Performance metrics */
  performance_metrics: ToolPerformanceMetrics;
}

/**
 * Tool performance metrics
 */
export interface ToolPerformanceMetrics {
  latency_p50: number;        // 50th percentile latency
  latency_p95: number;        // 95th percentile latency
  throughput: number;         // Operations per second
  error_rate: number;         // Errors per minute
}

/**
 * Tool error tracking
 */
export interface ToolError {
  timestamp: string;
  error_type: string;
  message: string;
  stack_trace?: string;
  resolution_status: "open" | "resolved" | "investigating";
  impact: "low" | "medium" | "high";
}

// ============================================================================
// System Telemetry Types
// ============================================================================

/**
 * System telemetry for performance monitoring
 */
export interface SystemTelemetry {
  investigation_id: string;
  collection_timestamp: string;

  /** Orchestration metrics */
  orchestrator_metrics: OrchestratorMetrics;

  /** Tool utilization */
  tool_utilization: Record<string, ToolUtilization>;

  /** Performance metrics */
  performance_metrics: SystemPerformanceMetrics;

  /** Quality metrics */
  quality_metrics: QualityMetrics;

  /** Error tracking */
  warnings: TelemetryWarning[];
  errors: TelemetryError[];

  /** Resource usage */
  resource_usage: ResourceUsage;

  /** Investigation efficiency */
  efficiency_metrics: EfficiencyMetrics;
}

/**
 * Orchestration metrics
 */
export interface OrchestratorMetrics {
  loops_completed: number;
  avg_loop_duration_ms: number;
  decisions_made: number;
  escalations_triggered: number;
}

/**
 * Tool utilization statistics
 */
export interface ToolUtilization {
  calls: number;
  total_duration_ms: number;
  success_rate: number;
  avg_response_time_ms: number;
}

/**
 * System performance metrics
 */
export interface SystemPerformanceMetrics {
  total_processing_time_ms: number;
  peak_memory_usage_mb: number;
  cpu_utilization_percent: number;
  network_requests: number;
  cache_hit_rate: number;
}

/**
 * Quality metrics for analysis
 */
export interface QualityMetrics {
  evidence_quality_score: number;     // 0-1 average evidence quality
  source_diversity: number;           // Number of different data sources
  temporal_coverage: number;          // 0-1 time window coverage
  cross_validation_rate: number;      // 0-1 evidence cross-validation rate
}

/**
 * Resource usage tracking
 */
export interface ResourceUsage {
  external_api_calls: number;
  database_queries: number;
  storage_used_mb: number;
  bandwidth_used_mb: number;
}

/**
 * Investigation efficiency metrics
 */
export interface EfficiencyMetrics {
  time_to_first_evidence_ms: number;
  time_to_decision_ms: number;
  evidence_per_minute: number;
  false_positive_rate: number;
  human_intervention_required: boolean;
}

/**
 * Telemetry warning
 */
export interface TelemetryWarning {
  timestamp: string;
  component: string;
  message: string;
  severity: "low" | "medium" | "high";
  resolved: boolean;
}

/**
 * Telemetry error
 */
export interface TelemetryError {
  timestamp: string;
  component: string;
  error_type: string;
  message: string;
  stack_trace?: string;
  impact: "low" | "medium" | "high" | "critical";
  resolution_status: "open" | "investigating" | "resolved";
}

// ============================================================================
// Tool Configuration Types
// ============================================================================

/**
 * Tool configuration schema
 */
export interface ToolConfiguration {
  tool_name: string;
  enabled: boolean;
  timeout_ms: number;
  retry_attempts: number;
  retry_delay_ms: number;
  parameters: Record<string, unknown>;
  rate_limit?: {
    requests_per_minute: number;
    burst_size: number;
  };
  health_check?: {
    interval_ms: number;
    timeout_ms: number;
    failure_threshold: number;
  };
}

/**
 * Tool deployment information
 */
export interface ToolDeployment {
  tool_name: string;
  version: string;
  deployment_id: string;
  environment: "development" | "staging" | "production";
  deployed_at: string;
  deployed_by: string;
  status: "deploying" | "active" | "inactive" | "failed";
  endpoints: string[];
  health_check_url?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export type AgentToolResponse = ApiResponse<AgentTool>;
export type AgentToolListResponse = ApiResponse<AgentTool[]>;
export type SystemTelemetryResponse = ApiResponse<SystemTelemetry>;
export type ToolConfigurationResponse = ApiResponse<ToolConfiguration>;
export type ToolDeploymentResponse = ApiResponse<ToolDeployment>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates an agent tool object
 */
export const validateAgentTool = (tool: AgentTool): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!tool.name || tool.name.trim().length === 0) {
    errors.push("Tool must have a name");
  }

  if (tool.success_rate < 0 || tool.success_rate > 1) {
    errors.push("Success rate must be between 0 and 1");
  }

  if (tool.calls < 0) {
    errors.push("Call count cannot be negative");
  }

  if (tool.duration_ms < 0) {
    errors.push("Duration cannot be negative");
  }

  if (!tool.version || tool.version.trim().length === 0) {
    errors.push("Tool must have a version");
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validates tool configuration
 */
export const validateToolConfiguration = (config: ToolConfiguration): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.tool_name || config.tool_name.trim().length === 0) {
    errors.push("Tool configuration must have a tool name");
  }

  if (config.timeout_ms <= 0) {
    errors.push("Timeout must be positive");
  }

  if (config.retry_attempts < 0) {
    errors.push("Retry attempts cannot be negative");
  }

  if (config.retry_delay_ms < 0) {
    errors.push("Retry delay cannot be negative");
  }

  return { valid: errors.length === 0, errors };
};