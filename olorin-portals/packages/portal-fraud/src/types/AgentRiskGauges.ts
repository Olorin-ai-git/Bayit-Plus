/**
 * Type definitions for Agent Risk Gauges Integration
 * Feature: 012-agents-risk-gauges
 *
 * Defines all TypeScript interfaces for:
 * - Enhanced EKG Monitor state and props
 * - Agent Risk Gauge state and configuration
 * - ICE event types for real-time updates
 * - Configuration persistence and validation
 */

// ============================================================================
// Investigation & EKG Monitor Types
// ============================================================================

/**
 * Investigation lifecycle states
 */
export type InvestigationStatus =
  | 'initializing'  // Investigation starting, agents loading
  | 'active'        // Tools executing, agents running
  | 'complete'      // Investigation finished successfully
  | 'failed';       // Investigation failed/errored

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

// ============================================================================
// Agent Risk Gauge Types
// ============================================================================

/**
 * Agent type enum (matches investigation agent types)
 */
export type AgentType =
  | 'Device'    // Device fingerprint analysis
  | 'Location'  // Geolocation analysis
  | 'Logs'      // Log pattern analysis
  | 'Network'   // Network topology analysis
  | 'Risk'      // Risk scoring analysis
  | 'Labels';   // Entity labeling analysis

/**
 * Agent execution status enum
 */
export type AgentStatus =
  | 'pending'    // Agent initialized, not started
  | 'running'    // Agent actively executing tools
  | 'completed'  // Agent finished successfully
  | 'failed';    // Agent execution failed

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

  /** LLM analysis and thoughts for this agent (optional) */
  llm_thoughts?: string;

  /** Alternative field names for thoughts/analysis */
  thoughts?: string;
  analysis?: string;
}

// ============================================================================
// Risk Configuration Types
// ============================================================================

/**
 * Risk threshold definitions
 */
export interface RiskThresholds {
  /** Low/Medium boundary (0-100) */
  low: number;

  /** Medium/High boundary (0-100) */
  medium: number;

  /** Maximum risk value (always 100) */
  high: number;

  /** Severe warning threshold for pulse animation (70-100) */
  pulse: number;
}

/**
 * Risk level colors (hex format)
 */
export interface RiskColors {
  /** Low risk color (default: green #34c759) */
  low: string;

  /** Medium risk color (default: orange #ff9f0a) */
  medium: string;

  /** High risk color (default: red #ff3b30) */
  high: string;
}

/**
 * User configuration for risk gauge visualization
 * Persisted in localStorage with key: olorin_agent_risk_gauges_config
 */
export interface RiskConfiguration {
  /** Configuration schema version for migrations */
  version: string;

  /** Risk threshold values */
  thresholds: RiskThresholds;

  /** Risk level color scheme */
  colors: RiskColors;

  /** Needle animation speed in milliseconds */
  animationSpeed: number;
}

/**
 * Risk zone for gauge visualization
 */
export interface RiskZone {
  /** Zone start value */
  start: number;

  /** Zone end value */
  end: number;

  /** Zone color (hex) */
  color: string;

  /** Zone label */
  label: 'LOW' | 'MED' | 'HIGH';
}

// ============================================================================
// Configuration Schema & Validation
// ============================================================================

/**
 * Validate RiskConfiguration manually (Zod removed for build compatibility)
 */
export function validateRiskConfig(config: any): config is RiskConfiguration {
  if (!config || typeof config !== 'object') return false;
  if (config.version !== '1.0.0') return false;

  // Validate thresholds
  if (!config.thresholds || typeof config.thresholds !== 'object') return false;
  const t = config.thresholds;
  if (typeof t.low !== 'number' || t.low < 0 || t.low > 60) return false;
  if (typeof t.medium !== 'number' || t.medium < 40 || t.medium > 100) return false;
  if (typeof t.high !== 'number' || t.high !== 100) return false;
  if (typeof t.pulse !== 'number' || t.pulse < 70 || t.pulse > 100) return false;
  if (t.low >= t.medium || t.medium >= t.high) return false;

  // Validate colors
  if (!config.colors || typeof config.colors !== 'object') return false;
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!hexRegex.test(config.colors.low)) return false;
  if (!hexRegex.test(config.colors.medium)) return false;
  if (!hexRegex.test(config.colors.high)) return false;

  // Validate animation speed
  if (typeof config.animationSpeed !== 'number') return false;
  if (config.animationSpeed < 300 || config.animationSpeed > 2000) return false;

  return true;
}

/**
 * Default configuration (v1.0.0)
 */
export const DEFAULT_RISK_CONFIG: RiskConfiguration = {
  version: '1.0.0',
  thresholds: {
    low: 33,
    medium: 66,
    high: 100,
    pulse: 90,
  },
  colors: {
    low: '#34c759',    // Green
    medium: '#ff9f0a', // Orange
    high: '#ff3b30',   // Red
  },
  animationSpeed: 900, // 900ms spring animation
};

/**
 * Load configuration from localStorage
 */
export function loadConfig(): RiskConfiguration {
  try {
    const stored = localStorage.getItem('olorin_agent_risk_gauges_config');
    if (!stored) return DEFAULT_RISK_CONFIG;

    const parsed = JSON.parse(stored);

    // Version migration (future-proof)
    if (parsed.version !== '1.0.0') {
      return migrateConfig(parsed);
    }

    // Validate configuration
    if (validateRiskConfig(parsed)) {
      return parsed;
    } else {
      return DEFAULT_RISK_CONFIG;
    }
  } catch (error) {
    return DEFAULT_RISK_CONFIG;
  }
}

/**
 * Save configuration to localStorage (debounced in component)
 */
export function saveConfig(config: RiskConfiguration): void {
  try {
    localStorage.setItem('olorin_agent_risk_gauges_config', JSON.stringify(config));
  } catch (error) {
  }
}

/**
 * Migrate configuration from older versions
 */
export function migrateConfig(old: any): RiskConfiguration {
  if (old.version === '1.0.0') {
    return old as RiskConfiguration;
  }

  // Unknown version, use defaults
  return DEFAULT_RISK_CONFIG;
}

// ============================================================================
// ICE Event Types
// ============================================================================

/**
 * Tool execution event from ICE TOOL_EXECUTIONS topic
 */
export interface ToolExecutionEvent {
  event_type: 'tool_execution_complete' | 'tool_execution_failed';
  data: {
    tool_id: string;
    agent_name: string;
    tool_name: string;
    status: 'completed' | 'failed';
    timestamp: number;  // Unix epoch ms
    execution_time_ms: number;
  };
}

/**
 * Agent results event from ICE AGENT_RESULTS topic
 */
export interface AgentResultsEvent {
  event_type: 'agent_risk_update' | 'agent_complete';
  data: {
    agent_name: string;  // Maps to AgentType via mapAgentNameToType()
    risk_score: number;  // 0-100
    tools_executed: number;  // 0-40
    execution_time_ms: number;
    findings_count: number;
    status: 'running' | 'completed' | 'failed';
  };
}

/**
 * Progress update event from ICE PROGRESS_UPDATES topic
 */
export interface ProgressUpdateEvent {
  event_type: 'progress_update';
  data: {
    overall_progress: number;  // 0-100
    completed_count: number;
    running_count: number;
    queued_count: number;
    failed_count: number;
    status: 'initializing' | 'running' | 'completed' | 'failed';
  };
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

/**
 * Props for TPSSparkline component
 */
export interface TPSSparklineProps {
  /** Tools/sec history data (last 30 samples) */
  data: number[];

  /** Sparkline width in pixels */
  width?: number;

  /** Sparkline height in pixels */
  height?: number;

  /** Line color (hex) */
  lineColor?: string;

  /** Enable gradient fill under line */
  fill?: boolean;
}

/**
 * Props for EKGMonitor component
 */
export interface EKGMonitorProps {
  /** Heart rate in beats per minute (40-200) */
  bpm: number;

  /** Canvas width in pixels */
  width?: number;

  /** Canvas height in pixels */
  height?: number;

  /** Waveform line color (hex) */
  lineColor?: string;

  /** Grid line color (hex) */
  gridColor?: string;
}

/**
 * Props for HyperGauge component
 */
export interface HyperGaugeProps {
  /** Gauge diameter in pixels */
  size: number;

  /** Current value (0-max) */
  value: number;

  /** Maximum value (100 for risk, 40 for tools) */
  max: number;

  /** Gauge label (e.g., "RISK", "TOOLS") */
  label: string;

  /** Optional subtitle (e.g., "0-40") */
  subtitle?: string;

  /** Primary color (hex) */
  color: string;

  /** Agent color scheme */
  colorScheme: AgentColorScheme;

  /** Display risk threshold zones */
  showZones: boolean;

  /** Color zones for thresholds */
  zones?: RiskZone[];

  /** Arc fill from 0 to value */
  continuousFill: boolean;

  /** Pulse animation for severe mode */
  warnPulse: boolean;

  /** Animation style */
  needleMode: 'spring' | 'ease';

  /** Animation duration in milliseconds */
  animationMs: number;

  /** Optional value formatter */
  valueFormatter?: (value: number) => string;
}

/**
 * Props for LuxGaugesDashboard component
 */
export interface LuxGaugesDashboardProps {
  /** Agent states (1-6 agents) */
  agents: AgentRiskGaugeState[];

  /** Risk thresholds */
  riskThresholds: RiskThresholds;

  /** Pulse animation threshold */
  pulseThreshold: number;

  /** Animation speed in milliseconds */
  animationSpeed: number;

  /** Color scheme override */
  colorScheme?: 'light' | 'dark';
}

/**
 * Props for AgentRiskGaugesSection component
 */
export interface AgentRiskGaugesSectionProps {
  /** Investigation ID */
  investigationId: string;

  /** Agent states from investigation */
  agents: AgentRiskGaugeState[];

  /** ICE connection status */
  isConnected: boolean;

  /** Configuration change callback */
  onConfigChange?: (config: RiskConfiguration) => void;

  /** Initial configuration */
  initialConfig?: RiskConfiguration;

  /** Default expanded state */
  defaultExpanded?: boolean;
}

/**
 * Props for GaugeConfigPanel component
 */
export interface GaugeConfigPanelProps {
  /** Current configuration */
  config: RiskConfiguration;

  /** Configuration change callback */
  onChange: (config: RiskConfiguration) => void;

  /** Disabled state (all controls disabled) */
  disabled: boolean;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Type guard for investigation status
 */
export function isValidInvestigationStatus(
  status: string
): status is InvestigationStatus {
  return ['initializing', 'active', 'complete', 'failed'].includes(status);
}

/**
 * Type guard for agent status
 */
export function isValidAgentStatus(status: string): status is AgentStatus {
  return ['pending', 'running', 'completed', 'failed'].includes(status);
}

/**
 * Type guard for agent type
 */
export function isValidAgentType(type: string): type is AgentType {
  return ['Device', 'Location', 'Logs', 'Network', 'Risk', 'Labels'].includes(
    type
  );
}

/**
 * Validate risk score range
 */
export function isValidRiskScore(score: number): boolean {
  return Number.isFinite(score) && score >= 0 && score <= 100;
}

/**
 * Validate tools count range
 */
export function isValidToolsCount(count: number): boolean {
  return Number.isInteger(count) && count >= 0 && count <= 40;
}

/**
 * Validate hex color string
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate timestamp (within last 5 seconds)
 */
export function isValidTimestamp(timestamp: number): boolean {
  const now = Date.now();
  return (
    Number.isInteger(timestamp) &&
    timestamp <= now &&
    timestamp >= now - 5000
  );
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default initial state for EnhancedEKGMonitor
 */
export const DEFAULT_EKG_STATE: EnhancedEKGMonitorState = {
  toolsPerSec: 0,
  bpm: 40, // Minimum BPM (baseline)
  tpsHistory: [],
  isConnected: false,
  investigationStatus: 'initializing',
  completedTools: 0,
  runningTools: 0,
  queuedTools: 0,
  failedTools: 0,
  progress: 0,
  lastToolExecutionTime: null,
};

/**
 * Example agent color schemes (from agentColors.ts)
 */
export const AGENT_COLORS: Record<AgentType, AgentColorScheme> = {
  Device: { primary: '#3b82f6', secondary: '#60a5fa', opacity: 0.8 },
  Location: { primary: '#8b5cf6', secondary: '#a78bfa', opacity: 0.8 },
  Logs: { primary: '#ec4899', secondary: '#f472b6', opacity: 0.8 },
  Network: { primary: '#10b981', secondary: '#34d399', opacity: 0.8 },
  Risk: { primary: '#f59e0b', secondary: '#fbbf24', opacity: 0.8 },
  Labels: { primary: '#06b6d4', secondary: '#22d3ee', opacity: 0.8 },
};

/**
 * Default initial state for AgentRiskGauge
 */
export const DEFAULT_AGENT_STATE: AgentRiskGaugeState = {
  agentType: 'Device',
  riskScore: 0,
  toolsUsed: 0,
  status: 'pending',
  colorScheme: AGENT_COLORS.Device,
  executionTime: 0,
  findingsCount: 0,
  severeMode: false,
  startedAt: null,
  completedAt: null,
  agentName: 'Unknown Agent',
};

/**
 * Default initial metrics
 */
export const DEFAULT_METRICS: ToolExecutionMetrics = {
  toolsPerSecond: 0,
  totalTools: 0,
  activeTools: 0,
  completedTools: 0,
  failedTools: 0,
  averageExecutionTime: 0,
  peakToolsPerSecond: 0,
  lastUpdated: Date.now(),
};
