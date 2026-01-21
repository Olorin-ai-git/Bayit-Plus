import { ProgressData, EventData, AssertionResult } from './types';
import { ParsedInvestigationLogs } from './types';

export function checkProgressMonotonicity(
  progressHistory: ProgressData[]
): { violations: string[] } {
  const violations: string[] = [];
  if (progressHistory.length < 2) return { violations };

  for (let i = 1; i < progressHistory.length; i++) {
    const prev = progressHistory[i - 1];
    const curr = progressHistory[i];

    if (curr.completion_percent < prev.completion_percent) {
      violations.push(
        `Progress decreased: ${prev.completion_percent}% → ${curr.completion_percent}%`
      );
    }

    if (new Date(curr.updated_at) < new Date(prev.updated_at)) {
      violations.push(`Timestamp not monotonic at index ${i}`);
    }
  }
  return { violations };
}

export function checkEventOrdering(events: EventData[]): { violations: string[] } {
  const violations: string[] = [];
  if (events.length < 2) return { violations };

  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];

    if (curr.sequence <= prev.sequence) {
      violations.push(`Sequence not monotonic at event ${i}`);
    }

    if (new Date(curr.timestamp) < new Date(prev.timestamp)) {
      violations.push(`Timestamp not monotonic at event ${i}`);
    }

    if (curr.investigation_id !== prev.investigation_id) {
      violations.push(`Investigation ID mismatch at event ${i}`);
    }
  }
  return { violations };
}

export function checkSnapshotVersioning(
  snapshot1: Record<string, unknown>,
  snapshot2: Record<string, unknown>
): { violations: string[] } {
  const violations: string[] = [];
  const v1 = (snapshot1.version as number) || 0;
  const v2 = (snapshot2.version as number) || 0;
  const tag1 = (snapshot1.ETag as string) || '';
  const tag2 = (snapshot2.ETag as string) || '';

  if (v2 < v1) violations.push(`Version decreased: ${v1} → ${v2}`);
  if (v1 === v2 && tag1 === tag2) violations.push('Snapshot unchanged');

  return { violations };
}

export function checkUIConsistency(
  uiState: Record<string, unknown>,
  apiState: Record<string, unknown>
): { violations: string[] } {
  const violations: string[] = [];

  if ((uiState.status as string) !== (apiState.status as string)) {
    violations.push(
      `Status mismatch: UI=${uiState.status}, API=${apiState.status}`
    );
  }

  if ((uiState.completion_percent as number) !== (apiState.completion_percent as number)) {
    violations.push(
      `Completion % mismatch: UI=${uiState.completion_percent}, API=${apiState.completion_percent}`
    );
  }

  if ((uiState.lifecycle_stage as string) !== (apiState.lifecycle_stage as string)) {
    violations.push(
      `Stage mismatch: UI=${uiState.lifecycle_stage}, API=${apiState.lifecycle_stage}`
    );
  }

  return { violations };
}

export function checkLogSequence(logs: ParsedInvestigationLogs): { violations: string[] } {
  const violations: string[] = [];
  const allLogs = logs.rawLogs.logs || [];

  if (allLogs.length === 0) {
    violations.push('No backend logs found');
    return { violations };
  }

  let lastTs = allLogs[0].timestamp;
  for (let i = 1; i < allLogs.length; i++) {
    if (allLogs[i].timestamp < lastTs) violations.push(`Timestamp violation at ${i}`);
    lastTs = allLogs[i].timestamp;
  }

  let lastSeq = allLogs[0].sequence;
  for (let i = 1; i < allLogs.length; i++) {
    if (allLogs[i].sequence <= lastSeq) violations.push(`Sequence violation at ${i}`);
    lastSeq = allLogs[i].sequence;
  }

  const hasMeaningful =
    logs.llmInteractions.length > 0 || logs.toolExecutions.length > 0 || logs.agentDecisions.length > 0;
  if (!hasMeaningful) violations.push('No meaningful backend events');

  return { violations };
}

export function checkLogCorrelation(
  frontendEntries: Array<{ timestamp: string }>,
  backendLogs: ParsedInvestigationLogs,
  investigationId: string
): { violations: string[]; correlationRatio: number } {
  const violations: string[] = [];
  const timeTolerance = 100;

  if (frontendEntries.length === 0) violations.push('No frontend entries');
  if (!backendLogs.rawLogs.logs?.length) violations.push('No backend logs');

  let correlated = 0;
  for (const fe of frontendEntries) {
    const feTime = new Date(fe.timestamp).getTime();
    const found = (backendLogs.rawLogs.logs || []).some((log) => {
      const beTime = new Date(log.timestamp).getTime();
      return Math.abs(feTime - beTime) <= timeTolerance && log.investigation_id === investigationId;
    });
    if (found) correlated += 1;
  }

  const ratio = frontendEntries.length > 0 ? correlated / frontendEntries.length : 0;
  if (ratio < 0.7) violations.push(`Low correlation: ${(ratio * 100).toFixed(1)}%`);

  return { violations, correlationRatio: ratio };
}
