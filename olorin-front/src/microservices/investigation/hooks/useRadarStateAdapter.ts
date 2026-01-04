/**
 * Radar State Adapter Hook
 * Feature: 006-hybrid-graph-integration
 *
 * Adapts hybrid graph data to existing RadarSection component format.
 * Enables reuse of Feature 004 Radar visualization for hybrid graph investigations.
 */

import { useMemo } from 'react';
import type { AgentRiskGaugeState } from '@shared/types/AgentRiskGauges';

interface RadarAnomaly {
  id: string;
  type: string;
  severity: string;
  source: string;
  description: string;
  timestamp: string;
  angle: number;
  distance: number;
}

interface RadarAgent {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  angle: number;
  distance: number;
}

interface RadarState {
  anomalies: RadarAnomaly[];
  agents: RadarAgent[];
  stats: {
    runningAgents: number;
    completedAgents: number;
    totalAnomalies: number;
  };
  scanning: boolean;
  showLabels: boolean;
}

/**
 * Adapts hybrid graph data to radar state format
 */
export function useRadarStateAdapter(
  isHybridGraph: boolean,
  structuredRadarState: RadarState,
  hybridRadarAnomalies: RadarAnomaly[],
  agentGauges: AgentRiskGaugeState[]
): RadarState {
  return useMemo(() => {
    if (!isHybridGraph) {
      return structuredRadarState;
    }

    // Create adapted radar state from hybrid graph data
    return {
      anomalies: hybridRadarAnomalies,
      agents: agentGauges.map((gauge) => ({
        id: gauge.id,
        name: gauge.name,
        status: gauge.status,
        angle: Math.random() * 360, // Position agents around radar
        distance: 50 + Math.random() * 30
      })),
      stats: {
        runningAgents: agentGauges.filter((g) => g.status === 'running').length,
        completedAgents: agentGauges.filter((g) => g.status === 'completed').length,
        totalAnomalies: hybridRadarAnomalies.length
      },
      scanning: true,
      showLabels: true
    };
  }, [isHybridGraph, structuredRadarState, hybridRadarAnomalies, agentGauges]);
}
