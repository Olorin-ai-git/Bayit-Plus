/**
 * EKG Monitor Types
 * Type definitions for Enhanced EKG Monitor component
 * Feature: 012-agents-risk-gauges
 */

/**
 * Investigation lifecycle states
 */
export type InvestigationStatus =
  | 'initializing' // Investigation starting, agents loading
  | 'active' // Tools executing, agents running
  | 'complete' // Investigation finished successfully
  | 'failed'; // Investigation failed/errored

/**
 * State for the Enhanced EKG Monitor component
 * Replaces HeartbeatMonitor with tools/sec metric and P-Q-R-S-T waveform
 */
export interface EnhancedEKGMonitorState {
  /** Current tools executed per second (0-40) */
  toolsPerSec: number;

  /** Calculated heart rate: BPM = 40 + (toolsPerSec × 4) */
  bpm: number;

  /** Historical tools/sec samples (last 30 readings) for sparkline */
  tpsHistory: number[];

  /** ICE connection status */
  isConnected: boolean;

  /** Investigation lifecycle state */
  investigationStatus: InvestigationStatus;

  /** Total completed tools in investigation */
  completedTools: number;

  /** Currently running tools */
  runningTools: number;

  /** Tools queued for execution */
  queuedTools: number;

  /** Failed tool executions */
  failedTools: number;

  /** Overall investigation progress percentage (0-100) */
  progress: number;

  /** Timestamp of last tool execution event (Unix epoch ms) */
  lastToolExecutionTime: number | null;
}

/**
 * Props for EnhancedEKGMonitor component (matches HeartbeatMonitor interface)
 * Ensures backward compatibility with existing InvestigationProgressPage
 */
export interface EnhancedEKGMonitorProps {
  /** Overall investigation progress percentage (0-100) */
  progress: number;

  /** Count of completed tools */
  completed: number;

  /** Count of running tools */
  running: number;

  /** Count of queued tools */
  queued: number;

  /** Count of failed tools */
  failed: number;

  /** ICE connection status */
  isConnected: boolean;

  /** Expected total tool executions (constant from settings) */
  expectedTotal?: number;
}

/**
 * Timestamp record for individual tool execution
 * Used to calculate rolling tools/sec metric with 1-second window
 */
export interface ToolExecutionTimestamp {
  /** Unique tool execution ID */
  toolId: string;

  /** Agent that executed the tool */
  agentName: string;

  /** Execution completion timestamp (Unix epoch ms) */
  timestamp: number;

  /** Execution result status */
  status: 'completed' | 'failed';

  /** Tool execution duration in milliseconds */
  duration: number;

  /** Tool name/type (e.g., "device_fingerprint", "ip_geolocation") */
  toolName: string;
}

/**
 * Aggregate metrics for tool execution performance
 * Calculated from ToolExecutionTimestamp records
 */
export interface ToolExecutionMetrics {
  /** Current tools per second (1-second rolling window) */
  toolsPerSecond: number;

  /** Total tools executed across all agents */
  totalTools: number;

  /** Tools currently running */
  activeTools: number;

  /** Successfully completed tools */
  completedTools: number;

  /** Failed tool executions */
  failedTools: number;

  /** Average tool execution time in milliseconds */
  averageExecutionTime: number;

  /** Peak tools/sec observed during investigation */
  peakToolsPerSecond: number;

  /** Timestamp when metrics were last updated (Unix epoch ms) */
  lastUpdated: number;
}
