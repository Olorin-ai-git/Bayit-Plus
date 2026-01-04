/**
 * Data Adapter Contracts
 * Feature: 007-progress-wizard-page
 *
 * TypeScript interfaces and contracts for transforming Olorin data
 * to GAIA component prop formats.
 *
 * ALL adapter functions MUST:
 * - Be pure (no side effects)
 * - Handle null/undefined gracefully
 * - Return valid defaults for missing data
 * - Include TypeScript type guards
 * - Be fully testable
 */

import type {
  InvestigationProgress,
  ToolExecution,
  AgentStatus,
  AnomalyDetection,
  EntityRelationship
} from '../data-model';

// ============================================================================
// GAIA Component Props Contracts
// ============================================================================

/**
 * ConnectionStatusHeader component props
 * Maps Olorin investigation state to GAIA status header
 */
export interface ConnectionStatusHeaderAdapter {
  /**
   * Transforms Olorin progress to ConnectionStatusHeader props
   *
   * @param progress - Olorin investigation progress
   * @param isPolling - Current polling state
   * @param handlers - Event handlers for user actions
   * @returns Props for ConnectionStatusHeader component
   *
   * @example
   * const props = adaptToConnectionStatus(progress, true, {
   *   onPause: () => pauseInvestigation(id),
   *   onCancel: () => cancelInvestigation(id),
   *   onResume: () => resumeInvestigation(id)
   * });
   */
  adaptToConnectionStatus(
    progress: InvestigationProgress,
    isPolling: boolean,
    handlers: {
      onPause: () => void;
      onCancel: () => void;
      onResume: () => void;
    }
  ): {
    investigationStatus: GAIAInvestigationStatus;
    isConnected: boolean;
    toolsPerSec: number;
    isProcessing: boolean;
    onPause: () => void;
    onCancel: () => void;
    onResume: () => void;
  };
}

/**
 * EnhancedEKGMonitor component props
 * Maps Olorin tool execution data to EKG monitor metrics
 */
export interface EKGMonitorAdapter {
  /**
   * Transforms Olorin progress to EKGMonitor props
   *
   * @param progress - Olorin investigation progress
   * @param isPolling - Current polling state
   * @returns Props for EnhancedEKGMonitor component
   *
   * @example
   * const props = adaptToEKGMonitor(progress, true);
   * // Result includes: progress %, tool counts, connection state
   */
  adaptToEKGMonitor(
    progress: InvestigationProgress,
    isPolling: boolean
  ): {
    progress: number;  // 0-100
    completed: number;
    running: number;
    queued: number;
    failed: number;
    isConnected: boolean;
    expectedTotal: number;
    investigationProgress: InvestigationProgress;
    investigationId: string;
  };
}

/**
 * AgentRiskGaugesSection component props
 * Maps Olorin tool executions to agent risk gauge data
 */
export interface AgentRiskGaugesAdapter {
  /**
   * Transforms Olorin progress to AgentRiskGauges props
   *
   * Derives agent statuses from toolExecutions if not provided by backend.
   * Calculates risk scores by aggregating tool risk values per agent.
   *
   * @param progress - Olorin investigation progress
   * @param isPolling - Current polling state
   * @returns Props for AgentRiskGaugesSection component
   *
   * @example
   * const props = adaptToAgentRiskGauges(progress, true);
   * // Result includes 6 agent statuses with risk scores, tool counts
   */
  adaptToAgentRiskGauges(
    progress: InvestigationProgress,
    isPolling: boolean
  ): {
    investigationId: string;
    agents: AgentStatus[];  // Always 6 agents (Device, Location, Logs, Network, Labels, Risk)
    isConnected: boolean;
    defaultExpanded: boolean;
    investigationProgress: InvestigationProgress;
  };
}

/**
 * InvestigationRadarView component props
 * Maps Olorin anomalies to radar visualization
 */
export interface RadarViewAdapter {
  /**
   * Transforms Olorin progress to RadarView props
   *
   * Extracts anomalies from tool execution results.
   * Positions anomalies based on detecting agent.
   *
   * @param progress - Olorin investigation progress
   * @param sandbox - Olorin sandbox context
   * @returns Props for InvestigationRadarView component
   *
   * @example
   * const props = adaptToRadarView(progress, sandboxContext);
   * // Result includes primary entity data, anomalies for radar display
   */
  adaptToRadarView(
    progress: InvestigationProgress,
    sandbox: any
  ): {
    investigationId: string;
    sandbox: any;
    entityId: string;
    entityType: string;
    userId: string;
    investigationProgress: InvestigationProgress;
  };
}

/**
 * EntityCorrelationGraph component props
 * Maps Olorin entities and relationships to graph visualization
 */
export interface EntityGraphAdapter {
  /**
   * Transforms Olorin progress to EntityCorrelationGraph props
   *
   * @param progress - Olorin investigation progress
   * @returns Props for EntityCorrelationGraph component
   *
   * @example
   * const props = adaptToEntityGraph(progress);
   * // Result includes graph configuration for vis-network
   */
  adaptToEntityGraph(
    progress: InvestigationProgress
  ): {
    investigationId: string;
    width: number;
    height: number;
    layout: 'force' | 'hierarchical' | 'circular';
    showMetrics: boolean;
    collapsible: boolean;
    minimizable: boolean;
    enablePolling: boolean;
    pollInterval: number;
  };
}

// ============================================================================
// Helper Function Contracts
// ============================================================================

/**
 * Builds agent statuses from tool executions
 * Used when backend doesn't provide agentStatuses array
 */
export interface AgentStatusBuilder {
  /**
   * Derives agent statuses from tool execution array
   *
   * MUST return statuses for ALL 6 agents (Device, Location, Logs, Network, Labels, Risk)
   * even if no tools executed yet (status: 'pending', toolsCompleted: 0)
   *
   * @param toolExecutions - Array of tool executions
   * @returns Array of 6 agent statuses
   *
   * @example
   * const agents = buildAgentStatuses(progress.toolExecutions);
   * expect(agents).toHaveLength(6);
   * expect(agents[0].agentType).toBe('device');
   */
  buildAgentStatuses(toolExecutions: ToolExecution[]): AgentStatus[];
}

/**
 * Calculates average risk score from tool executions
 * Aggregates per agent
 */
export interface RiskScoreCalculator {
  /**
   * Calculates average risk score for an agent
   *
   * Extracts risk from tool.result.riskScore || tool.result.risk
   * Normalizes to 0-100 scale (GAIA uses 0-100, not 0-1)
   * Returns 0 if no tools have risk scores
   *
   * @param tools - Tool executions for specific agent
   * @returns Risk score 0-100
   *
   * @example
   * const deviceTools = toolExecutions.filter(t => t.agentType === 'device');
   * const risk = calculateAverageRisk(deviceTools);
   * expect(risk).toBeGreaterThanOrEqual(0);
   * expect(risk).toBeLessThanOrEqual(100);
   */
  calculateAverageRisk(tools: ToolExecution[]): number;

  /**
   * Extracts risk score from single tool execution
   *
   * Checks multiple possible locations:
   * - tool.result.riskScore
   * - tool.result.risk
   * - tool.result.metadata.riskScore
   * - tool.result.metadata.risk
   *
   * Normalizes 0-1 scale to 0-100 if needed
   *
   * @param tool - Tool execution
   * @returns Risk score 0-100 or null if not found
   */
  extractRiskScore(tool: ToolExecution): number | null;
}

/**
 * Extracts anomaly detections from tool results
 * For radar visualization
 */
export interface AnomalyExtractor {
  /**
   * Extracts anomalies from tool execution results
   *
   * Searches tool.result.findings for anomaly-type findings
   * Maps to AnomalyDetection format
   * Sorts by severity and recency
   * Returns top 10 for radar display
   *
   * @param progress - Olorin investigation progress
   * @returns Array of up to 10 anomalies
   *
   * @example
   * const anomalies = extractAnomalies(progress);
   * expect(anomalies.length).toBeLessThanOrEqual(10);
   * // First anomaly should be most severe/recent
   */
  extractAnomalies(progress: InvestigationProgress): AnomalyDetection[];
}

/**
 * Calculates aggregate tool execution statistics
 * For EKG monitor and metrics displays
 */
export interface ToolStatsCalculator {
  /**
   * Calculates tool execution statistics
   *
   * Counts tools by status: completed, running, queued, failed, skipped
   *
   * @param toolExecutions - Array of tool executions
   * @returns Statistics object with counts
   *
   * @example
   * const stats = calculateToolStats(progress.toolExecutions);
   * expect(stats.total).toBe(stats.completed + stats.running + stats.queued + stats.failed + stats.skipped);
   */
  calculateToolStats(toolExecutions: ToolExecution[]): {
    completed: number;
    running: number;
    queued: number;
    failed: number;
    skipped: number;
    total: number;
  };
}

/**
 * Maps Olorin investigation status to GAIA status enum
 */
export interface StatusMapper {
  /**
   * Maps Olorin status to GAIA investigationStatus
   *
   * Mapping:
   * - 'pending' -> 'pending'
   * - 'initializing' -> 'submitted'
   * - 'running' -> 'running'
   * - 'paused' -> 'paused'
   * - 'completed' -> 'completed'
   * - 'failed' -> 'failed'
   * - 'cancelled' -> 'cancelled'
   *
   * @param olorinStatus - Olorin investigation status
   * @returns GAIA investigation status
   *
   * @example
   * const gaiaStatus = mapStatus('initializing');
   * expect(gaiaStatus).toBe('submitted');
   */
  mapStatus(olorinStatus: string): GAIAInvestigationStatus;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard contracts for safe data access
 */
export interface TypeGuards {
  /**
   * Checks if progress has agent statuses from backend
   */
  hasAgentStatuses(progress: InvestigationProgress): boolean;

  /**
   * Checks if progress has risk metrics by agent
   */
  hasRiskByAgent(progress: InvestigationProgress): boolean;

  /**
   * Checks if investigation is in terminal state
   */
  isTerminalStatus(status: string): boolean;

  /**
   * Checks if tool execution has risk score
   */
  hasRiskScore(tool: ToolExecution): boolean;
}

// ============================================================================
// Constants Contracts
// ============================================================================

/**
 * Agent display names for UI
 */
export const AGENT_DISPLAY_NAMES: Record<AgentType, string>;

/**
 * Agent color schemes for gauges (GAIA corporate colors)
 */
export const AGENT_COLORS: Record<string, {
  primary: string;
  secondary: string;
  opacity: number;
}>;

/**
 * Risk threshold values for color coding
 */
export const RISK_THRESHOLDS: {
  LOW_MAX: 39;
  MEDIUM_MAX: 59;
  HIGH_MAX: 79;
  CRITICAL_MIN: 80;
};

/**
 * Polling configuration constants
 */
export const POLLING_CONFIG: {
  PROGRESS_INTERVAL_MS: 3000;
  EKG_INTERVAL_MS: 3000;
  ENTITY_GRAPH_INTERVAL_MS: 30000;
  MAX_RETRIES: 5;
  RETRY_BACKOFF_MS: number[];  // [3000, 6000, 12000, 24000, 30000]
};

// ============================================================================
// Type Aliases
// ============================================================================

export type AgentType = 'device' | 'location' | 'logs' | 'network' | 'labels' | 'risk';

export type GAIAInvestigationStatus =
  | 'pending'
  | 'draft'
  | 'running'
  | 'submitted'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ToolStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped';

export type AgentStatusType = 'pending' | 'running' | 'completed' | 'failed';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Validation Contracts
// ============================================================================

/**
 * Validation functions for data integrity
 */
export interface DataValidators {
  /**
   * Validates progress data completeness
   * Checks for required fields and valid ranges
   */
  validateProgress(progress: InvestigationProgress): {
    valid: boolean;
    errors: string[];
  };

  /**
   * Validates tool execution data
   * Checks status, timestamps, agent type
   */
  validateToolExecution(tool: ToolExecution): {
    valid: boolean;
    errors: string[];
  };

  /**
   * Validates agent status data
   * Checks tool counts, risk score range, percentages
   */
  validateAgentStatus(agent: AgentStatus): {
    valid: boolean;
    errors: string[];
  };
}
