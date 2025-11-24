/**
 * Risk Updates Subscription Hook
 * Task: T031 - Phase 3: Risk Visualization
 * Feature: 002-visualization-microservice
 *
 * Subscribes to risk-updated events from the EventBus and provides
 * real-time risk gauge updates for agents.
 */

import { useEffect, useState, useCallback } from 'react';
import { eventBus } from '@shared/events/EventBus';
import type { AgentRiskGaugeState, AgentType } from '@shared/types/AgentRiskGauges';

/**
 * Risk update event payload
 */
export interface RiskUpdateEvent {
  /** Agent type being updated */
  agentType: AgentType;

  /** New risk score (0-100) */
  riskScore: number;

  /** Number of tools executed */
  toolsExecuted: number;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Number of findings detected */
  findingsCount: number;

  /** Agent status */
  status: 'pending' | 'running' | 'completed' | 'failed';

  /** Update timestamp */
  timestamp: number;
}

/**
 * Hook for subscribing to agent risk updates via EventBus
 *
 * @param agentType - Optional specific agent to filter updates for
 * @param onUpdate - Callback for risk updates
 * @returns Current risk state and update handler
 */
export function useRiskUpdates(
  agentType?: AgentType,
  onUpdate?: (event: RiskUpdateEvent) => void
) {
  const [riskData, setRiskData] = useState<Map<AgentType, RiskUpdateEvent>>(new Map());

  const handleRiskUpdate = useCallback(
    (event: RiskUpdateEvent) => {
      // Filter by agent type if specified
      if (agentType && event.agentType !== agentType) {
        return;
      }

      // Update internal state
      setRiskData((prev) => {
        const next = new Map(prev);
        next.set(event.agentType, event);
        return next;
      });

      // Call external callback
      if (onUpdate) {
        onUpdate(event);
      }
    },
    [agentType, onUpdate]
  );

  useEffect(() => {
    // Subscribe to risk-updated events
    const subscription = eventBus.on<RiskUpdateEvent>('risk-updated', handleRiskUpdate);

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [handleRiskUpdate]);

  return {
    /** Current risk data for all agents */
    riskData,

    /** Get risk data for specific agent */
    getRiskData: (agent: AgentType) => riskData.get(agent),

    /** Check if agent has any data */
    hasData: (agent: AgentType) => riskData.has(agent),
  };
}

/**
 * Hook for subscribing to all agent risk updates
 *
 * @param initialAgents - Initial agent states
 * @returns Array of agent states with real-time updates
 */
export function useAllRiskUpdates(
  initialAgents: AgentRiskGaugeState[]
): AgentRiskGaugeState[] {
  const [agents, setAgents] = useState<AgentRiskGaugeState[]>(initialAgents);

  useEffect(() => {
    const handleUpdate = (event: RiskUpdateEvent) => {
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.agentType === event.agentType) {
            // Update agent with new risk data
            return {
              ...agent,
              riskScore: event.riskScore,
              toolsUsed: event.toolsExecuted,
              executionTime: event.executionTimeMs,
              findingsCount: event.findingsCount,
              status: event.status,
              severeMode: event.riskScore >= 90, // Pulse threshold
            };
          }
          return agent;
        })
      );
    };

    const subscription = eventBus.on<RiskUpdateEvent>('risk-updated', handleUpdate);

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty deps - handler is stable

  return agents;
}

/**
 * Utility: Emit a risk update event
 *
 * @param event - Risk update event data
 */
export function emitRiskUpdate(event: RiskUpdateEvent): void {
  eventBus.emit('risk-updated', event);
}
