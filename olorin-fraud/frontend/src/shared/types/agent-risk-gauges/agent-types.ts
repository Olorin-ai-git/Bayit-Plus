/**
 * Agent Types
 * Type definitions for Agent Risk Gauges
 * Feature: 012-agents-risk-gauges
 */

/**
 * Agent type enum (matches investigation agent types)
 */
export type AgentType =
  | 'Device' // Device fingerprint analysis
  | 'Location' // Geolocation analysis
  | 'Logs' // Log pattern analysis
  | 'Network' // Network topology analysis
  | 'Risk' // Risk scoring analysis
  | 'Labels'; // Entity labeling analysis

/**
 * Agent execution status enum
 */
export type AgentStatus =
  | 'pending' // Agent initialized, not started
  | 'running' // Agent actively executing tools
  | 'completed' // Agent finished successfully
  | 'failed'; // Agent execution failed

/**
 * Agent color scheme (imported from radar visualization)
 */
export interface AgentColorScheme {
  /** Primary agent color (hex) */
  primary: string;

  /** Secondary/accent color (hex) */
  secondary: string;

  /** Opacity for fills (0-1) */
  opacity: number;
}

/**
 * State for a single Agent Risk Gauge
 * Represents one agent's risk score, tool usage, and execution status
 */
export interface AgentRiskGaugeState {
  /** Unique agent identifier */
  agentType: AgentType;

  /** Current risk score (0-100) */
  riskScore: number;

  /** Number of tools executed by this agent (0-40) */
  toolsUsed: number;

  /** Agent execution status */
  status: AgentStatus;

  /** Visual color scheme for agent */
  colorScheme: AgentColorScheme;

  /** Total execution time in milliseconds */
  executionTime: number;

  /** Count of findings/alerts detected by agent */
  findingsCount: number;

  /** Severe mode active (risk ≥ pulse threshold) */
  severeMode: boolean;

  /** Timestamp when agent started (Unix epoch ms) */
  startedAt: number | null;

  /** Timestamp when agent completed (Unix epoch ms) */
  completedAt: number | null;

  /** Human-readable agent name (e.g., "Device Fingerprint Agent") */
  agentName: string;
}
