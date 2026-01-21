/**
 * Type Guards
 * Feature: 007-progress-wizard-page
 *
 * TypeScript type guards for safe data access.
 */

import { InvestigationProgress, AgentStatus, ToolExecution } from '../../../../shared/types/investigation';
import { extractRiskScore } from './riskCalculators';

/**
 * Checks if progress has agent statuses from backend
 */
export function hasAgentStatuses(
  progress: InvestigationProgress
): progress is InvestigationProgress & { agentStatuses: AgentStatus[] } {
  return Array.isArray(progress.agentStatuses) && progress.agentStatuses.length > 0;
}

/**
 * Checks if progress has risk metrics by agent
 */
export function hasRiskByAgent(
  progress: InvestigationProgress
): progress is InvestigationProgress & { riskMetrics: { byAgent: Record<string, number> } } {
  return progress.riskMetrics?.byAgent !== undefined
    && Object.keys(progress.riskMetrics.byAgent).length > 0;
}

/**
 * Checks if tool execution has risk score
 */
export function hasRiskScore(tool: ToolExecution): boolean {
  return extractRiskScore(tool) !== null;
}
