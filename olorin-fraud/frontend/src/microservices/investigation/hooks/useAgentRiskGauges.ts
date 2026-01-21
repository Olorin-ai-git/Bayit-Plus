/**
 * Agent Risk Gauges Hook
 * Feature: 004-new-olorin-frontend
 *
 * Manages agent risk gauge states and metrics.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  AgentRiskGaugeState,
  AgentType
} from '@shared/types/AgentRiskGauges';
import { AGENT_COLORS } from '@shared/types/AgentRiskGauges';
import { AgentName } from '@shared/types/agent.types';
import type { WizardSettings } from '@shared/types/wizard.types';

/**
 * Hook to manage agent risk gauges
 */
export function useAgentRiskGauges(settings: WizardSettings | null) {
  const [agentGauges, setAgentGauges] = useState<AgentRiskGaugeState[]>([]);

  // Initialize agent gauges from settings
  useEffect(() => {
    if (!settings) return;

    // Map agent names to gauge states
    const agentTypeMap: Record<AgentName, AgentType> = {
      [AgentName.DEVICE_ANALYSIS]: 'Device',
      [AgentName.LOCATION_ANALYSIS]: 'Location',
      [AgentName.NETWORK_ANALYSIS]: 'Network',
      [AgentName.BEHAVIOR_ANALYSIS]: 'Risk',
      [AgentName.LOGS_ANALYSIS]: 'Logs'
    };

    const initialGauges: AgentRiskGaugeState[] = [
      AgentName.DEVICE_ANALYSIS,
      AgentName.LOCATION_ANALYSIS,
      AgentName.NETWORK_ANALYSIS,
      AgentName.BEHAVIOR_ANALYSIS,
      AgentName.LOGS_ANALYSIS
    ].map((agentName) => {
      const agentType = agentTypeMap[agentName];
      return {
        agentType,
        riskScore: 0,
        toolsUsed: 0,
        status: 'pending',
        colorScheme: AGENT_COLORS[agentType],
        executionTime: 0,
        findingsCount: 0,
        severeMode: false,
        startedAt: null,
        completedAt: null,
        agentName: agentName.replace('_', ' ')
      };
    });

    setAgentGauges(initialGauges);
  }, [settings]);

  // Update agent metrics
  const updateAgentMetrics = useCallback((
    agentType: AgentType,
    updates: Partial<AgentRiskGaugeState>
  ) => {
    setAgentGauges((prev) => {
      return prev.map((agent) => {
        if (agent.agentType === agentType) {
          return { ...agent, ...updates };
        }
        return agent;
      });
    });
  }, []);

  return { agentGauges, updateAgentMetrics };
}
