/**
 * EKG Metrics Calculator
 * Feature: 004-new-olorin-frontend
 *
 * Pure function to calculate EKG metrics from investigation state.
 * No side effects, fully testable.
 */

import type { WizardSettings } from '@shared/types/wizard.types';
import type { ToolExecution } from '@shared/components';

/**
 * EKG metrics interface
 */
export interface EKGMetrics {
  progress: number;
  completed: number;
  running: number;
  queued: number;
  failed: number;
  expectedTotal: number;
}

/**
 * Calculate EKG metrics from tool executions
 */
export function calculateEKGMetrics(
  settings: WizardSettings | null,
  toolExecutions: ToolExecution[]
): EKGMetrics {
  const totalTools = settings?.tools.filter((t) => t.enabled).length || 0;
  const completedCount = toolExecutions.filter((t) => t.status === 'completed').length;
  const runningCount = toolExecutions.filter((t) => t.status === 'running').length;
  const queuedCount = toolExecutions.filter((t) => t.status === 'pending').length;
  const failedCount = toolExecutions.filter((t) => t.status === 'failed').length;
  const progressPercent = totalTools > 0 ? Math.round((completedCount / totalTools) * 100) : 0;

  return {
    progress: progressPercent,
    completed: completedCount,
    running: runningCount,
    queued: queuedCount,
    failed: failedCount,
    expectedTotal: totalTools
  };
}
