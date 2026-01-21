/**
 * Statistics Calculators
 * Feature: 007-progress-wizard-page (T019)
 *
 * Calculates aggregate tool execution statistics.
 */

import { ToolExecution } from '../../../../shared/types/investigation';

/**
 * Calculates aggregate tool execution statistics
 *
 * @param toolExecutions - Array of tool executions
 * @returns Statistics object with counts
 */
export function calculateToolStats(toolExecutions: ToolExecution[]): {
  completed: number;
  running: number;
  queued: number;
  failed: number;
  skipped: number;
  total: number;
} {
  return {
    completed: toolExecutions.filter(t => t.status === 'completed').length,
    running: toolExecutions.filter(t => t.status === 'running').length,
    queued: toolExecutions.filter(t => t.status === 'queued').length,
    failed: toolExecutions.filter(t => t.status === 'failed').length,
    skipped: toolExecutions.filter(t => t.status === 'skipped').length,
    total: toolExecutions.length
  };
}
