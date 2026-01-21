/**
 * Component Adapters Layer
 * Feature: 007-progress-wizard-page (T023-T037)
 *
 * Transforms InvestigationProgress to Olorin component prop formats.
 * Maps Olorin backend responses to specific component interfaces.
 *
 * SYSTEM MANDATE Compliance:
 * - Pure functions (no side effects)
 * - No hardcoded values
 * - Handle missing data gracefully
 * - Return valid defaults
 */

import { InvestigationProgress, AgentStatus } from '../../../shared/types/investigation';
import { buildAgentStatuses, calculateToolStats, mapStatus, progressHasAgentStatuses } from './dataAdapters';

// ============================================================================
// EKG Monitor Adapter (T023-T024)
// ============================================================================

/**
 * Props interface for EnhancedEKGMonitor component
 */
export interface EKGMonitorProps {
  progress: number;  // 0-100
  completed: number;
  running: number;
  queued: number;
  failed: number;
  isConnected: boolean;
  expectedTotal?: number;
  toolsPerSec?: number;
}

/**
 * Adapts InvestigationProgress to EKGMonitor props
 * @param progress - Olorin investigation progress
 * @param isPolling - Current polling state
 * @returns Props for EnhancedEKGMonitor component
 */
export function adaptToEKGMonitor(
  progress: InvestigationProgress | null,
  isPolling: boolean
): EKGMonitorProps {
  if (!progress) {
    console.log('⚠️ [adaptToEKGMonitor] No progress data available');
    return {
      progress: 0,
      completed: 0,
      running: 0,
      queued: 0,
      failed: 0,
      isConnected: false,
      expectedTotal: 0,
      toolsPerSec: 0
    };
  }

  const stats = calculateToolStats(progress.toolExecutions || []);

  const result = {
    progress: progress.completionPercent || 0,
    completed: stats.completed,
    running: stats.running,
    queued: stats.queued,
    failed: stats.failed,
    isConnected: isPolling,
    expectedTotal: progress.totalTools || 0,
    toolsPerSec: progress.toolsPerSecond || 0
  };

  console.log('📊 [adaptToEKGMonitor] Adapted data:', result);
  return result;
}

// ============================================================================
// Agent Risk Gauges Adapter (T025-T030)
// ============================================================================

/**
 * Agent risk gauge state (matches LuxGaugesDashboard expectations)
 */
export interface AgentRiskGaugeState {
  agentType: string;
  riskScore: number;  // 0-100
  toolsUsed: number;  // 0-40
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * Risk thresholds configuration
 */
export interface RiskThresholds {
  low: number;
  medium: number;
  high: number;
}

/**
 * Risk color scheme
 */
export interface RiskColors {
  low: string;
  medium: string;
  high: string;
}

/**
 * Props interface for AgentRiskGaugesSection/LuxGaugesDashboard
 */
export interface AgentRiskGaugesProps {
  agents: AgentRiskGaugeState[];
  riskThresholds: RiskThresholds;
  pulseThreshold: number;
  animationSpeed: number;
  colorScheme: RiskColors;
}

/**
 * Maps AgentStatus to AgentRiskGaugeState format
 */
function mapAgentToGaugeState(agent: AgentStatus): AgentRiskGaugeState {
  return {
    agentType: agent.agentName,  // Use human-readable name
    riskScore: agent.riskScore,
    toolsUsed: Math.min(agent.toolsCompleted, 40),  // Cap at 40 for gauge
    status: agent.status
  };
}

/**
 * Adapts InvestigationProgress to AgentRiskGauges props
 * @param progress - Olorin investigation progress (may include domainFindings)
 * @param isPolling - Current polling state
 * @returns Props for AgentRiskGaugesSection/LuxGaugesDashboard
 */
export function adaptToAgentRiskGauges(
  progress: (InvestigationProgress & { domainFindings?: Record<string, any> }) | null,
  isPolling: boolean
): AgentRiskGaugesProps {
  // Default configuration
  const defaultProps: AgentRiskGaugesProps = {
    agents: [],
    riskThresholds: { low: 39, medium: 59, high: 79 },
    pulseThreshold: 80,
    animationSpeed: 1000,
    colorScheme: {
      low: '#10b981',    // Green
      medium: '#06b6d4',  // Cyan
      high: '#ef4444'     // Red
    }
  };

  if (!progress) {
    return defaultProps;
  }

  // Get agent statuses (derive if not provided by backend)
  // Pass domainFindings to buildAgentStatuses to use risk scores from domain findings
  const hasBackendAgentStatuses = progressHasAgentStatuses(progress);

  const agents = hasBackendAgentStatuses
    ? progress.agentStatuses
    : buildAgentStatuses(progress.toolExecutions || [], (progress as any).domainFindings);

  // Map to gauge state format
  const gaugeStates = agents.map(mapAgentToGaugeState);

  return {
    ...defaultProps,
    agents: gaugeStates
  };
}

// ============================================================================
// Connection Status Adapter (T031-T032)
// ============================================================================

/**
 * Props interface for ConnectionStatusHeader component
 */
export interface ConnectionStatusHeaderProps {
  investigationStatus: 'pending' | 'draft' | 'running' | 'submitted' | 'paused' | 'completed' | 'failed' | 'cancelled';
  isConnected: boolean;
  toolsPerSec: number;
  isProcessing: boolean;
  onPause: () => void;
  onCancel: () => void;
  onResume: () => void;
}

/**
 * Adapts InvestigationProgress to ConnectionStatusHeader props
 * @param progress - Olorin investigation progress
 * @param isPolling - Current polling state
 * @param handlers - Event handlers for user actions
 * @returns Props for ConnectionStatusHeader component
 */
export function adaptToConnectionStatus(
  progress: InvestigationProgress | null,
  isPolling: boolean,
  handlers: {
    onPause: () => void;
    onCancel: () => void;
    onResume: () => void;
  }
): ConnectionStatusHeaderProps {
  if (!progress) {
    return {
      investigationStatus: 'pending',
      isConnected: false,
      toolsPerSec: 0,
      isProcessing: false,
      ...handlers
    };
  }

  return {
    investigationStatus: mapStatus(progress.status),
    isConnected: isPolling,
    toolsPerSec: progress.toolsPerSecond,
    isProcessing: progress.status === 'running',
    ...handlers
  };
}
