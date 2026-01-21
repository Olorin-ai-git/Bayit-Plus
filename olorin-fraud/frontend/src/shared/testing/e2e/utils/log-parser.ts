import {
  ParsedInvestigationLogs,
  InvestigationLogs,
  LLMInteractionLog,
  ToolExecutionLog,
  AgentDecisionLog,
  ErrorLog,
} from './types';

export function parseLogs(rawLogs: InvestigationLogs): ParsedInvestigationLogs {
  const llmInteractions: LLMInteractionLog[] = [];
  const toolExecutions: ToolExecutionLog[] = [];
  const agentDecisions: AgentDecisionLog[] = [];
  const errors: ErrorLog[] = [];

  if (!rawLogs.logs || !Array.isArray(rawLogs.logs)) {
    return {
      investigationId: rawLogs.investigation_id,
      llmInteractions,
      toolExecutions,
      agentDecisions,
      errors,
      rawLogs,
    };
  }

  for (const log of rawLogs.logs) {
    const eventType = log.event_type?.toLowerCase() || '';
    const data = log.data || {};

    if (eventType.includes('llm') || eventType.includes('model')) {
      llmInteractions.push({
        timestamp: log.timestamp,
        agent_name: (data.agent_name as string) || 'unknown',
        model_name: (data.model_name as string) || 'unknown',
        full_prompt: (data.full_prompt as string) || undefined,
        response: (data.response as string) || '',
        tokens_used: (data.tokens_used as number) || undefined,
        confidence_score: (data.confidence_score as number) || undefined,
        response_time_ms: (data.response_time_ms as number) || 0,
      });
    } else if (eventType.includes('tool')) {
      toolExecutions.push({
        timestamp: log.timestamp,
        tool_name: (data.tool_name as string) || 'unknown',
        tool_parameters: (data.tool_parameters as Record<string, unknown>) || {},
        selection_reasoning: (data.selection_reasoning as string) || '',
        execution_result: (data.execution_result as string) || '',
        success: (data.success as boolean) ?? false,
        error_message: (data.error_message as string) || undefined,
        execution_time_ms: (data.execution_time_ms as number) || 0,
      });
    } else if (eventType.includes('decision') || eventType.includes('agent')) {
      agentDecisions.push({
        timestamp: log.timestamp,
        decision_type: (data.decision_type as string) || eventType,
        context: (data.context as string) || '',
        reasoning: (data.reasoning as string) || '',
        decision_outcome: (data.decision_outcome as string) || '',
        confidence_score: (data.confidence_score as number) || undefined,
        alternatives: (data.alternatives as string[]) || undefined,
        execution_time_ms: (data.execution_time_ms as number) || 0,
      });
    } else if (eventType.includes('error') || log.severity === 'ERROR') {
      errors.push({
        timestamp: log.timestamp,
        error_type: (data.error_type as string) || eventType,
        message: log.message || (data.message as string) || '',
        context: (data.context as string) || undefined,
        stack: (data.stack as string) || undefined,
      });
    }
  }

  return {
    investigationId: rawLogs.investigation_id,
    llmInteractions,
    toolExecutions,
    agentDecisions,
    errors,
    rawLogs,
  };
}

export function validateLogSequence(logs: InvestigationLogs): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const allLogs = logs.logs || [];

  if (allLogs.length === 0) {
    violations.push('No logs found');
    return { valid: false, violations };
  }

  let lastTimestamp = allLogs[0].timestamp;
  for (let i = 1; i < allLogs.length; i++) {
    if (allLogs[i].timestamp < lastTimestamp) {
      violations.push(`Timestamp violation at index ${i}: not monotonic`);
    }
    lastTimestamp = allLogs[i].timestamp;
  }

  let lastSequence = allLogs[0].sequence;
  for (let i = 1; i < allLogs.length; i++) {
    if (allLogs[i].sequence <= lastSequence) {
      violations.push(`Sequence violation at index ${i}: not monotonic`);
    }
    lastSequence = allLogs[i].sequence;
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export function correlateLogsWithFrontend(
  frontendEntries: Array<{ timestamp: string; message: string }>,
  backendLogs: InvestigationLogs,
  investigationId: string
): {
  matched: number;
  unmatched: { source: string; count: number }[];
} {
  const timeTolerance = 100;
  let matched = 0;
  const unmatchedFrontend = frontendEntries.length;
  const unmatchedBackend = backendLogs.logs?.length || 0;

  for (const frontendEntry of frontendEntries) {
    const frontendTime = new Date(frontendEntry.timestamp).getTime();

    const found = (backendLogs.logs || []).some((log) => {
      const backendTime = new Date(log.timestamp).getTime();
      return Math.abs(frontendTime - backendTime) <= timeTolerance;
    });

    if (found) {
      matched += 1;
    }
  }

  return {
    matched,
    unmatched: [
      { source: 'frontend', count: unmatchedFrontend - matched },
      { source: 'backend', count: unmatchedBackend },
    ],
  };
}
