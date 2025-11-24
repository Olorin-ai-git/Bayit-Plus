/**
 * Agent Status Builders
 * Feature: 007-progress-wizard-page (T015)
 *
 * Builds agent statuses from tool executions when backend doesn't provide them.
 */

import { ToolExecution, AgentStatus } from '../../../../shared/types/investigation';
import { ALL_AGENT_TYPES, getAgentDisplayName } from '../../constants/agentConfig';
import { calculateAverageRisk, extractRiskScore } from './riskCalculators';

/**
 * Utility: Groups array of objects by key
 */
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Determines agent status based on tool execution counts
 */
function determineAgentStatus(
  completed: number,
  failed: number,
  running: number,
  total: number
): 'pending' | 'running' | 'completed' | 'failed' {
  if (failed > 0 && completed === 0) return 'failed';
  if (completed === total && total > 0) return 'completed';
  if (running > 0) return 'running';
  return 'pending';
}

/**
 * Checks if progress object has agent statuses array
 *
 * @param progress - Investigation progress object
 * @returns True if agentStatuses exists and is non-empty array
 */
export function progressHasAgentStatuses(progress: { agentStatuses?: AgentStatus[] }): boolean {
  return Boolean(progress.agentStatuses && Array.isArray(progress.agentStatuses) && progress.agentStatuses.length > 0);
}

/**
 * Builds agent statuses from tool executions and domain findings
 * Used when backend doesn't provide agentStatuses array
 *
 * MUST return statuses for ALL 6 agents even if no tools executed
 *
 * @param toolExecutions - Array of tool executions
 * @param domainFindings - Domain findings with risk scores (optional)
 * @returns Array of 6 agent statuses
 */
export function buildAgentStatuses(
  toolExecutions: ToolExecution[],
  domainFindings?: Record<string, any>
): AgentStatus[] {
  // Group tools by agent type
  const toolsByAgent = groupBy(toolExecutions || [], 'agentType');

  // Map domain names to agent types (lowercase to match ALL_AGENT_TYPES)
  const domainToAgentType: Record<string, string> = {
    'network': 'network',
    'device': 'device',
    'location': 'location',
    'logs': 'logs',
    'authentication': 'labels',  // Backend sends 'authentication', frontend uses 'labels'
    'risk': 'risk'
  };

  // Create status for each agent (always 6 agents)
  return ALL_AGENT_TYPES.map(agentType => {
    const tools = toolsByAgent[agentType] || [];

    const completed = tools.filter(t => t.status === 'completed').length;
    const failed = tools.filter(t => t.status === 'failed').length;
    const running = tools.filter(t => t.status === 'running').length;

    const totalExecutionTime = tools
      .filter(t => t.completedAt)
      .reduce((sum, t) => sum + t.executionTimeMs, 0);

    const findingsCount = tools
      .filter(t => t.result?.findings)
      .reduce((sum, t) => sum + (t.result?.findings.length || 0), 0);

    // Get risk score from domain findings if available, otherwise calculate from tools
    let riskScore = calculateAverageRisk(tools);
    let maxRisk = Math.max(...tools.map(t => extractRiskScore(t) || 0), 0);

    // Override with domain findings if available
    if (domainFindings) {
      // Find matching domain by agent type
      const domainKey = Object.keys(domainFindings).find(
        domain => domainToAgentType[domain] === agentType
      );

      if (domainKey && domainFindings[domainKey]) {
        const finding = domainFindings[domainKey];

        // Use riskScore directly (authoritative value from backend, converted to camelCase by BaseApiService)
        // Backend sends risk scores in 0-1 scale, convert to 0-100 for display
        const domainRiskScore = finding.riskScore ?? 0;
        riskScore = domainRiskScore * 100; // Convert 0-1 to 0-100
        maxRisk = riskScore;

        console.log(`🎯 [agentBuilders] ${agentType} domain findings:`, {
          domainKey,
          rawRiskScore: domainRiskScore,
          displayRiskScore: riskScore,
          hasEvidence: !!finding.evidence,
          evidenceCount: finding.evidence?.length || 0
        });

        // Update findings count from domain evidence
        const evidenceCount = finding.evidence?.length || 0;
        const riskIndicatorsCount = finding.risk_indicators?.length || 0;
        if (evidenceCount + riskIndicatorsCount > findingsCount) {
          // Use domain findings count if higher
        }
      }
    }

    return {
      agentType,
      agentName: getAgentDisplayName(agentType),
      status: determineAgentStatus(completed, failed, running, tools.length),
      toolsCompleted: completed,
      totalTools: tools.length,
      progressPercent: tools.length > 0 ? Math.round((completed / tools.length) * 100) : 0,
      averageExecutionTimeMs: tools.length > 0 ? Math.round(totalExecutionTime / tools.length) : 0,
      findingsCount,
      riskScore: Math.round(riskScore),
      maxRiskDetected: Math.round(maxRisk),
      startedAt: tools[0]?.startedAt || null,
      completedAt: completed === tools.length && tools.length > 0 ? tools[tools.length - 1]?.completedAt || null : null
    };
  });
}
