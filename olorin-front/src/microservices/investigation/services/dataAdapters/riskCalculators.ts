/**
 * Risk Score Calculators
 * Feature: 007-progress-wizard-page (T016, T017)
 *
 * Calculates and extracts risk scores from tool executions.
 */

import { ToolExecution } from '../../../../shared/types/investigation';

/**
 * Calculates average risk score for an agent
 * Aggregates risk scores from all tool executions
 *
 * @param tools - Tool executions for specific agent
 * @returns Risk score 0-100
 */
export function calculateAverageRisk(tools: ToolExecution[]): number {
  const toolsWithRisk = tools
    .map(t => extractRiskScore(t))
    .filter(r => r !== null) as number[];

  if (toolsWithRisk.length === 0) return 0;

  const sum = toolsWithRisk.reduce((acc, r) => acc + r, 0);
  return Math.round(sum / toolsWithRisk.length);
}

/**
 * Extracts risk score from single tool execution
 * Checks multiple possible locations and normalizes to 0-100
 *
 * @param tool - Tool execution
 * @returns Risk score 0-100 or null if not found
 */
export function extractRiskScore(tool: ToolExecution): number | null {
  if (!tool.result) return null;

  const risk = tool.result.riskScore
    || tool.result.risk
    || (tool.result.metadata as Record<string, unknown>)?.riskScore
    || (tool.result.metadata as Record<string, unknown>)?.risk;

  if (typeof risk !== 'number') return null;

  // Normalize: if 0-1 scale, convert to 0-100
  return risk <= 1 ? Math.round(risk * 100) : Math.round(risk);
}
