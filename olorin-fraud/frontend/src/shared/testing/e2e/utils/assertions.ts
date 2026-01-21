import { TestLogger } from '../utils/test-logger';
import { ProgressData, EventData, AssertionResult, ParsedInvestigationLogs } from './types';
import {
  checkProgressMonotonicity,
  checkEventOrdering,
  checkSnapshotVersioning,
  checkUIConsistency,
  checkLogSequence,
  checkLogCorrelation,
} from './assertion-helpers';

export function assertProgressMonotonicity(
  progressHistory: ProgressData[],
  options?: { logger?: TestLogger }
): AssertionResult {
  const logger = options?.logger;
  const { violations } = checkProgressMonotonicity(progressHistory);

  if (violations.length === 0) {
    const percents = progressHistory.map((p) => p.completion_percent);
    logger?.success('Progress monotonicity valid', {
      samples: progressHistory.length,
      minPercent: Math.min(...percents),
      maxPercent: Math.max(...percents),
    });
  } else {
    logger?.warn('Progress monotonicity violations', { count: violations.length });
  }

  return { passed: violations.length === 0, violations, details: { samples: progressHistory.length } };
}

export function assertEventOrdering(
  events: EventData[],
  options?: { logger?: TestLogger }
): AssertionResult {
  const logger = options?.logger;
  const { violations } = checkEventOrdering(events);

  if (violations.length === 0) {
    logger?.success('Event ordering valid', {
      totalEvents: events.length,
      minSequence: events[0]?.sequence,
      maxSequence: events[events.length - 1]?.sequence,
    });
  } else {
    logger?.warn('Event ordering violations', { count: violations.length });
  }

  return { passed: violations.length === 0, violations, details: { totalEvents: events.length } };
}

export function assertSnapshotVersioning(
  snapshot1: Record<string, unknown>,
  snapshot2: Record<string, unknown>,
  options?: { logger?: TestLogger }
): AssertionResult {
  const logger = options?.logger;
  const { violations } = checkSnapshotVersioning(snapshot1, snapshot2);
  const v1 = (snapshot1.version as number) || 0;
  const v2 = (snapshot2.version as number) || 0;

  if (violations.length === 0) {
    logger?.success('Snapshot versioning valid', { v1, v2 });
  } else {
    logger?.warn('Snapshot versioning issues', { count: violations.length });
  }

  return { passed: violations.length === 0, violations, details: { version1: v1, version2: v2 } };
}

export function assertUIConsistency(
  uiState: Record<string, unknown>,
  apiState: Record<string, unknown>,
  options?: { logger?: TestLogger }
): AssertionResult {
  const logger = options?.logger;
  const { violations } = checkUIConsistency(uiState, apiState);

  if (violations.length === 0) {
    logger?.success('UI consistency valid', {
      status: uiState.status,
      percent: uiState.completion_percent,
    });
  } else {
    logger?.warn('UI consistency violations', { count: violations.length });
  }

  return { passed: violations.length === 0, violations };
}

export function assertBackendLogSequence(
  logs: ParsedInvestigationLogs,
  options?: { logger?: TestLogger }
): AssertionResult {
  const logger = options?.logger;
  const { violations } = checkLogSequence(logs);

  if (violations.length === 0) {
    logger?.success('Backend log sequence valid', {
      totalEvents: logs.rawLogs.logs?.length,
      llmCalls: logs.llmInteractions.length,
      toolExecutions: logs.toolExecutions.length,
    });
  } else {
    logger?.warn('Backend log sequence violations', { count: violations.length });
  }

  return { passed: violations.length === 0, violations };
}

export function assertLogCorrelation(
  frontendEntries: Array<{ timestamp: string; level?: string; message: string }>,
  backendLogs: ParsedInvestigationLogs,
  investigationId: string,
  options?: { logger?: TestLogger }
): AssertionResult {
  const logger = options?.logger;
  const { violations, correlationRatio } = checkLogCorrelation(frontendEntries, backendLogs, investigationId);

  if (violations.length === 0) {
    logger?.success('Log correlation valid', {
      investigationId,
      correlationRatio: `${(correlationRatio * 100).toFixed(1)}%`,
    });
  } else {
    logger?.warn('Log correlation issues', { count: violations.length });
  }

  return { passed: violations.length === 0, violations, details: { correlationRatio } };
}
