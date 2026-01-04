/**
 * Progress Data Selection Hook
 * Feature: 007-progress-wizard-page
 *
 * Selects between hybrid graph and structured investigation data
 */

import type { InvestigationLog, InvestigationPhase, ToolExecution, Relationship, AgentGauge, RadarState } from '@shared/types/investigation';

interface HybridGraphData {
  logs: InvestigationLog[];
  phases: InvestigationPhase[];
  currentPhaseId: string | null;
  toolExecutions: ToolExecution[];
  relationships: Relationship[];
  agentGauges: AgentGauge[];
  ekgMetrics: any;
  radarAnomalies: any[];
}

interface SelectionResult {
  logs: InvestigationLog[];
  phases: InvestigationPhase[];
  currentPhaseId: string | null;
  toolExecutions: ToolExecution[];
  relationships: Relationship[];
  agentGauges: AgentGauge[];
}

export function useProgressDataSelection(
  isHybridGraph: boolean,
  hybridGraphData: HybridGraphData,
  structuredLogs: InvestigationLog[],
  structuredPhases: InvestigationPhase[],
  structuredPhaseId: string | null,
  structuredToolExecutions: ToolExecution[],
  structuredRelationships: Relationship[],
  structuredAgentGauges: AgentGauge[]
): SelectionResult {
  return {
    logs: isHybridGraph ? hybridGraphData.logs : structuredLogs,
    phases: isHybridGraph ? hybridGraphData.phases : structuredPhases,
    currentPhaseId: isHybridGraph ? hybridGraphData.currentPhaseId : structuredPhaseId,
    toolExecutions: isHybridGraph ? hybridGraphData.toolExecutions : structuredToolExecutions,
    relationships: isHybridGraph ? hybridGraphData.relationships : structuredRelationships,
    agentGauges: isHybridGraph ? hybridGraphData.agentGauges : structuredAgentGauges
  };
}
