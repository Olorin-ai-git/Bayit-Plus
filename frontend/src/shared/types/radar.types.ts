/**
 * Radar Visualization Type Definitions
 * Feature: 004-new-olorin-frontend
 *
 * Real-time investigation visualization with concentric agent rings,
 * tool ticks, anomaly blips, and scanning ray animation.
 * Uses Olorin corporate color palette.
 */

import { AgentName } from './agent.types';

/** Agent execution status for radar rings */
export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Tool execution status for radar ticks */
export type ToolStatus = 'running' | 'completed' | 'queued' | 'failed' | 'skipped';

/** Anomaly severity levels */
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

/** Polar coordinates for radar positioning */
export interface PolarCoordinate {
  angle: number; // Radians (0=right, π/2=down, π=left, 3π/2=up)
  radius: number; // Distance from origin (px)
}

/** Cartesian coordinates for SVG positioning */
export interface CartesianCoordinate {
  x: number;
  y: number;
}

/** Anomaly position with stacking support */
export interface AnomalyPosition extends CartesianCoordinate {
  stackIndex: number; // Position in vertical stack (0-N)
}

/**
 * Top-level state for Investigation Radar View
 */
export interface RadarVisualizationState {
  agents: RadarAgentRing[];
  anomalies: RadarAnomaly[];
  stats: RadarStats;
  uiState: RadarUIState;
  metadata: RadarMetadata;
}

/**
 * Agent as concentric ring on radar
 */
export interface RadarAgentRing {
  agentIndex: number; // 0-5
  name: AgentName;
  status: AgentStatus;
  radius: number; // Distance from center (px)
  color: string; // Olorin corporate color
  tools: RadarToolTick[];
  anomalyCount: number;
  executionTime?: number; // Milliseconds
  riskScore?: number; // 0-100
}

/**
 * Tool as radial tick on agent ring
 */
export interface RadarToolTick {
  toolName: string;
  agentIndex: number;
  toolIndex: number;
  angle: number; // Radians
  status: ToolStatus;
  position: CartesianCoordinate;
  anomalies: RadarAnomaly[];
  progress?: number; // 0-100
}

/**
 * Security anomaly detected by tools
 */
export interface RadarAnomaly {
  id: string; // 'ANM-0001', 'ANM-0002', etc.
  type: string; // 'Account Takeover', 'Identity Theft', etc.
  riskLevel: number; // 0-100
  severity: SeverityLevel;
  detected: number; // Unix timestamp (ms)
  detectedBy: {
    agent: AgentName;
    tool: string;
    agentIndex: number;
    toolIndex: number;
  };
  position: AnomalyPosition;
  evidence?: any;
  color: string; // Risk-based color
  llmThoughts?: string; // AI-generated analysis and reasoning
  rawData?: any; // Raw detection data for forensics
}

/**
 * Investigation statistics
 */
export interface RadarStats {
  activeAgents: number;
  activeTools: number;
  totalAnomalies: number;
  criticalThreats: number;
  averageRiskLevel: number; // 0-100
  scanTime: number; // Seconds
  totalScans: number;
  systemUptime: number; // Percentage
}

/**
 * UI control state
 */
export interface RadarUIState {
  isScanning: boolean;
  selectedAnomaly: RadarAnomaly | null;
  hoveredTool: string | null;
  showLabels: boolean;
  filterRiskLevel: number | null;
}

/**
 * Investigation metadata
 */
export interface RadarMetadata {
  investigationId: string;
  entityId: string;
  entityType: string;
  startTime: number; // Unix timestamp (ms)
  status: 'initializing' | 'loading' | 'active' | 'paused' | 'completed' | 'error';
}

/**
 * Reducer action types
 */
export type RadarAction =
  | { type: 'AGENT_STARTED'; payload: { agentIndex: number } }
  | { type: 'AGENT_STATUS_UPDATE'; payload: { agentName: AgentName; status: AgentStatus } }
  | { type: 'TOOL_EXECUTION_UPDATE'; payload: { agentName: AgentName; toolName: string; status: ToolStatus; progress?: number } }
  | { type: 'ANOMALY_DETECTED'; payload: { anomaly: RadarAnomaly } }
  | { type: 'UPDATE_STATS'; payload: Partial<RadarStats> }
  | { type: 'TOGGLE_SCANNING' }
  | { type: 'SELECT_ANOMALY'; payload: { anomaly: RadarAnomaly | null } }
  | { type: 'SET_FILTER_RISK_LEVEL'; payload: { riskLevel: number | null } }
  | { type: 'TOGGLE_LABELS' }
  | { type: 'HOVER_TOOL'; payload: { toolName: string | null } }
  | { type: 'CLEAR_STATE' };
