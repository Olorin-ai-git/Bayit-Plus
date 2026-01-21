/**
 * Adapted Components Hook
 * Feature: 007-progress-wizard-page
 *
 * Handles component adapter logic for EKG, agent gauges, radar, and entity graph
 */

import React from 'react';
import { DEFAULT_RISK_CONFIG } from '@shared/types/AgentRiskGauges';
import type { InvestigationProgress } from '@shared/types/investigation';
import type { Investigation } from '@shared/types/wizard.types';
import { adaptToEKGMonitor, adaptToAgentRiskGauges, adaptToConnectionStatus } from '../services/componentAdapters';
import { adaptToRadarView } from '../services/dataAdapters/radarAdapters';
import { adaptToEntityGraph } from '../services/dataAdapters/entityGraphAdapters';

interface UseAdaptedComponentsProps {
  isHybridGraph: boolean;
  structuredProgress: InvestigationProgress | null | undefined;
  isStructuredPolling: boolean;
  hybridGraphData: any;
  radarState: any;
  investigationIsRunning: boolean;
}

export function useAdaptedComponents(props: UseAdaptedComponentsProps) {
  const {
    isHybridGraph,
    structuredProgress,
    isStructuredPolling,
    hybridGraphData,
    radarState,
    investigationIsRunning
  } = props;

  const ekgMetrics = isHybridGraph
    ? hybridGraphData.ekgMetrics
    : adaptToEKGMonitor(structuredProgress, isStructuredPolling);

  const agentGaugesProps = isHybridGraph
    ? { agents: hybridGraphData.agentGauges, ...DEFAULT_RISK_CONFIG }
    : adaptToAgentRiskGauges(structuredProgress, isStructuredPolling);

  const radarViewStructured = React.useMemo(() => {
    const adaptedState = adaptToRadarView(structuredProgress, isStructuredPolling);
    if (!structuredProgress && investigationIsRunning && !isHybridGraph) {
      adaptedState.uiState.isScanning = true;
      adaptedState.metadata.status = 'active';
    }
    return {
      ...adaptedState,
      uiState: {
        ...adaptedState.uiState,
        ...radarState.uiState
      }
    };
  }, [structuredProgress, isStructuredPolling, investigationIsRunning, isHybridGraph, radarState.uiState]);

  const entityGraphProps = adaptToEntityGraph(structuredProgress, isStructuredPolling);

  const connectionStatusProps = adaptToConnectionStatus(structuredProgress, isStructuredPolling, {
    onPause: () => console.log('[ProgressPage] Pause requested'),
    onResume: () => console.log('[ProgressPage] Resume requested'),
    onCancel: () => console.log('[ProgressPage] Cancel requested')
  });

  return {
    ekgMetrics,
    agentGaugesProps,
    radarViewStructured,
    entityGraphProps,
    connectionStatusProps
  };
}
