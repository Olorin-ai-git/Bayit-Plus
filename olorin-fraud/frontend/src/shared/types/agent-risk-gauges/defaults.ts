/**
 * Default Values
 * Default constants and initial states
 * Feature: 012-agents-risk-gauges
 */

import type { EnhancedEKGMonitorState, ToolExecutionMetrics } from './ekg-monitor-types';
import type { AgentRiskGaugeState, AgentColorScheme, AgentType } from './agent-types';

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
