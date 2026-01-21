/**
 * Hybrid Graph Adapter Hook
 * Feature: 006-hybrid-graph-integration
 *
 * Adapts hybrid graph polling data to existing visualization component formats.
 * Enables reuse of Radar, Gauges, EKG, Relationship Graph for hybrid investigations.
 */

import { useMemo } from 'react';
import type { InvestigationStatus } from '../types/hybridGraphTypes';
import type { AgentRiskGaugeState } from '@shared/types/AgentRiskGauges';

interface AdaptedVisualizationData {
  phases: any[];
  currentPhaseId: string;
  toolExecutions: any[];
  logs: any[];
  agentGauges: AgentRiskGaugeState[];
  radarAnomalies: any[];
  relationships: any[];
  ekgMetrics: any;
}

/**
 * Adapts hybrid graph status to existing visualization components
 */
export function useHybridGraphAdapter(
  hybridStatus: InvestigationStatus | null
): AdaptedVisualizationData {
  // Adapt phases
  const phases = useMemo(() => {
    if (!hybridStatus) return [];

    const phaseMap = [
      { id: 'initialization', name: 'Initialization', progress: 0 },
      { id: 'domain_analysis', name: 'Domain Analysis', progress: 0 },
      { id: 'risk_assessment', name: 'Risk Assessment', progress: 0 },
      { id: 'evidence_gathering', name: 'Evidence Gathering', progress: 0 },
      { id: 'summary', name: 'Summary', progress: 0 },
    ];

    const currentPhase = hybridStatus.current_phase;
    const overallProgress = hybridStatus.progress_percentage;

    return phaseMap.map((phase, index) => {
      let status = 'pending';
      let progress = 0;

      if (phase.id === currentPhase) {
        status = 'in_progress';
        progress = overallProgress;
      } else if (index < phaseMap.findIndex((p) => p.id === currentPhase)) {
        status = 'completed';
        progress = 100;
      }

      return { ...phase, status, progress };
    });
  }, [hybridStatus]);

  // Adapt current phase
  const currentPhaseId = hybridStatus?.current_phase || 'initialization';

  // Adapt tool executions
  const toolExecutions = useMemo(() => {
    if (!hybridStatus?.tool_executions) return [];

    return hybridStatus.tool_executions.map((tool) => ({
      id: tool.tool_id,
      name: tool.tool_name,
      status: tool.status,
      startedAt: tool.started_at,
      completedAt: tool.completed_at,
      duration: tool.duration_ms,
      output: tool.output_summary,
      error: tool.error_message,
    }));
  }, [hybridStatus?.tool_executions]);

  // Adapt logs
  const logs = useMemo(() => {
    if (!hybridStatus?.logs) return [];

    return hybridStatus.logs.map((log) => ({
      id: `${log.timestamp}-${log.source}`,
      timestamp: log.timestamp,
      level: log.severity,
      source: log.source,
      message: log.message,
      metadata: log.metadata,
    }));
  }, [hybridStatus?.logs]);

  // Adapt agent gauges
  const agentGauges = useMemo((): AgentRiskGaugeState[] => {
    if (!hybridStatus?.agent_status) return [];

    return Object.entries(hybridStatus.agent_status).map(([agentKey, agent]) => ({
      id: agentKey,
      name: agent.agent_name,
      status: agent.status as 'idle' | 'running' | 'completed' | 'error',
      riskScore: 50, // Default, updated from findings
      baselineRisk: 30,
      category: getCategoryFromAgentName(agent.agent_name),
      executionTime: agent.execution_time_ms || 0,
      findingsCount: agent.findings_count,
      confidence: agent.progress_percentage / 100,
    }));
  }, [hybridStatus?.agent_status]);

  // Adapt radar anomalies (from logs with warning/error severity)
  const radarAnomalies = useMemo(() => {
    if (!hybridStatus?.logs) return [];

    return hybridStatus.logs
      .filter((log) => log.severity === 'warning' || log.severity === 'error')
      .slice(0, 10)
      .map((log, index) => ({
        id: `anomaly-${index}`,
        type: log.severity === 'error' ? 'critical' : 'suspicious',
        severity: log.severity === 'error' ? 'high' : 'medium',
        source: log.source,
        description: log.message,
        timestamp: log.timestamp,
        angle: (index * 36) % 360,
        distance: 60 + Math.random() * 30,
      }));
  }, [hybridStatus?.logs]);

  // Adapt relationships (from agent interactions)
  const relationships = useMemo(() => {
    if (!hybridStatus?.agent_status) return [];

    const agents = Object.keys(hybridStatus.agent_status);
    const relationships = [];

    for (let i = 0; i < agents.length - 1; i++) {
      relationships.push({
        id: `rel-${i}`,
        source: agents[i],
        target: agents[i + 1],
        type: 'data_flow',
        strength: 0.7,
      });
    }

    return relationships;
  }, [hybridStatus?.agent_status]);

  // Adapt EKG metrics
  const ekgMetrics = useMemo(() => {
    const toolCount = hybridStatus?.tool_executions?.length || 0;
    const completedTools = hybridStatus?.tool_executions?.filter((t) => t.status === 'completed').length || 0;
    const errorLogs = hybridStatus?.logs?.filter((l) => l.severity === 'error').length || 0;

    return {
      heartRate: Math.min(120, 60 + toolCount * 5),
      variability: completedTools > 0 ? 10 + Math.random() * 5 : 5,
      avgResponseTime: 150 + Math.random() * 50,
      errorRate: errorLogs,
      systemLoad: Math.min(100, (hybridStatus?.progress_percentage || 0) * 0.8),
    };
  }, [hybridStatus?.tool_executions, hybridStatus?.logs, hybridStatus?.progress_percentage]);

  return {
    phases,
    currentPhaseId,
    toolExecutions,
    logs,
    agentGauges,
    radarAnomalies,
    relationships,
    ekgMetrics,
  };
}

/**
 * Helper: Get agent category from agent name
 */
function getCategoryFromAgentName(agentName: string): string {
  const name = agentName.toLowerCase();
  if (name.includes('device')) return 'device';
  if (name.includes('location')) return 'location';
  if (name.includes('network')) return 'network';
  if (name.includes('log')) return 'logs';
  if (name.includes('risk')) return 'risk';
  return 'general';
}
