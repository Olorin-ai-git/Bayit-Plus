/**
 * Progress Adapters Hook
 * Feature: 007-progress-wizard-page
 *
 * Computes all adapter values for progress visualization
 * Includes control handlers for pause/resume/cancel operations
 */

import React from 'react';
import { DEFAULT_RISK_CONFIG } from '@shared/types/AgentRiskGauges';
import type { InvestigationProgress, RadarState } from '@shared/types/investigation';
import type { Investigation } from '@shared/types/wizard.types';
import {
  adaptToEKGMonitor,
  adaptToAgentRiskGauges,
  adaptToConnectionStatus
} from '../services/componentAdapters';
import { adaptToRadarView } from '../services/dataAdapters/radarAdapters';
import { adaptToEntityGraph } from '../services/dataAdapters/entityGraphAdapters';
import { investigationService } from '../services/investigationService';

interface AdaptersResult {
  ekgMetrics: any;
  agentGaugesProps: any;
  radarViewStructured: any;
  entityGraphProps: any;
  connectionStatusProps: any;
}

export function useProgressAdapters(
  isHybridGraph: boolean,
  structuredProgress: (InvestigationProgress & { domainFindings?: Record<string, any> }) | null | undefined,
  isStructuredPolling: boolean,
  hybridGraphData: any,
  effectiveInvestigation: Investigation | null | undefined,
  radarState: RadarState,
  agentGauges: any
): AdaptersResult {
  const ekgMetrics = isHybridGraph
    ? hybridGraphData.ekgMetrics
    : adaptToEKGMonitor(structuredProgress, isStructuredPolling);

  const agentGaugesProps = isHybridGraph
    ? { agents: hybridGraphData.agentGauges, ...DEFAULT_RISK_CONFIG }
    : adaptToAgentRiskGauges(structuredProgress, isStructuredPolling);

  const investigationIsRunning = effectiveInvestigation?.status === 'running' ||
                                effectiveInvestigation?.status === 'in_progress' ||
                                effectiveInvestigation?.status === 'IN_PROGRESS';

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

  const investigationId = effectiveInvestigation?.id;

  const handlePause = React.useCallback(async () => {
    if (!investigationId) return;
    try {
      await investigationService.pauseInvestigation(investigationId);
    } catch (error) {
      // Error handling could be enhanced with user notification
    }
  }, [investigationId]);

  const handleResume = React.useCallback(async () => {
    if (!investigationId) return;
    try {
      await investigationService.resumeInvestigation(investigationId);
    } catch (error) {
      // Error handling could be enhanced with user notification
    }
  }, [investigationId]);

  const handleCancel = React.useCallback(async () => {
    if (!investigationId) return;
    try {
      await investigationService.cancelInvestigation(investigationId, 'Cancelled by user');
    } catch (error) {
      // Error handling could be enhanced with user notification
    }
  }, [investigationId]);

  const connectionStatusProps = adaptToConnectionStatus(
    structuredProgress,
    isStructuredPolling,
    { onPause: handlePause, onResume: handleResume, onCancel: handleCancel }
  );

  return {
    ekgMetrics,
    agentGaugesProps,
    radarViewStructured,
    entityGraphProps,
    connectionStatusProps
  };
}
