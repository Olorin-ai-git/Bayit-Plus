/**
 * Radar State Builder
 * Feature: 004-new-olorin-frontend
 *
 * Pure function to build RadarVisualizationState from investigation data.
 * No side effects, fully testable.
 */

import {
  RadarVisualizationState,
  RadarAgentRing,
  RadarAnomaly,
  RadarStats,
  RadarUIState,
  RadarMetadata
} from '@shared/types/radar.types';
import { AgentName, AgentStatus } from '@shared/types/agent.types';
import {
  calculateAgentRingRadius,
  getAgentColor
} from '@shared/utils/radarGeometry';
import type { WizardSettings, Investigation } from '@shared/types/wizard.types';
import type { Phase } from '@shared/components';

/**
 * Build radar visualization state from investigation data
 */
export function buildRadarState(
  settings: WizardSettings | null,
  investigation: Investigation | null,
  radarAnomalies: RadarAnomaly[],
  radarUIState: RadarUIState,
  phases: Phase[]
): RadarVisualizationState {
  // Default empty state
  if (!settings) {
    return {
      agents: [],
      anomalies: [],
      stats: {
        totalAgents: 0,
        runningAgents: 0,
        completedAgents: 0,
        failedAgents: 0,
        totalAnomalies: 0,
        criticalAnomalies: 0,
        highRiskAnomalies: 0,
        lastScanTime: 0
      },
      uiState: radarUIState,
      metadata: {
        investigationId: '',
        entityId: '',
        entityType: '',
        startTime: Date.now()
      }
    };
  }

  // Map agent names
  const agentNames: AgentName[] = [
    AgentName.DEVICE_ANALYSIS,
    AgentName.LOCATION_ANALYSIS,
    AgentName.NETWORK_ANALYSIS,
    AgentName.BEHAVIOR_ANALYSIS,
    AgentName.LOGS_ANALYSIS
  ];

  // Create radar agent rings
  const agents: RadarAgentRing[] = agentNames.map((name, index) => {
    const agentTools = (settings.tools || []).filter((t) => t.isEnabled).slice(index * 3, (index + 1) * 3);
    const phaseStatus = phases[index]?.status;
    const status: AgentStatus =
      phaseStatus === 'completed' ? 'completed' :
      phaseStatus === 'running' ? 'running' :
      phaseStatus === 'failed' ? 'failed' :
      'pending';

    return {
      agentIndex: index,
      name,
      status,
      radius: calculateAgentRingRadius(index),
      color: getAgentColor(index),
      tools: agentTools.map((tool, toolIndex) => ({
        toolIndex,
        name: tool.toolName,
        status: status === 'completed' ? 'completed' :
                status === 'running' ? 'running' :
                'pending',
        anomalyCount: 0
      })),
      anomalyCount: radarAnomalies.filter((a) => a.detectedBy.agent === name).length
    };
  });

  // Calculate stats
  const stats: RadarStats = {
    totalAgents: agents.length,
    runningAgents: agents.filter((a) => a.status === 'running').length,
    completedAgents: agents.filter((a) => a.status === 'completed').length,
    failedAgents: agents.filter((a) => a.status === 'failed').length,
    totalAnomalies: radarAnomalies.length,
    criticalAnomalies: radarAnomalies.filter((a) => a.riskLevel > 80).length,
    highRiskAnomalies: radarAnomalies.filter((a) => a.riskLevel > 60 && a.riskLevel <= 80).length,
    lastScanTime: Date.now() - (investigation?.createdAt ? new Date(investigation.createdAt).getTime() : 0)
  };

  // Metadata
  const metadata: RadarMetadata = {
    investigationId: investigation?.id || '',
    entityId: settings.entities[0]?.id || '',
    entityType: settings.entities[0]?.type || '',
    startTime: investigation?.createdAt ? new Date(investigation.createdAt).getTime() : Date.now()
  };

  return { agents, anomalies: radarAnomalies, stats, uiState: radarUIState, metadata };
}
