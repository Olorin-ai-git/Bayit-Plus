/**
 * Progress Data Mappers
 * Feature: 007-progress-wizard-page
 *
 * Maps backend endpoint response fields to frontend format.
 * Handles tool executions, agents, phases, entities, and errors.
 */

import { ToolExecution } from '../../../../shared/types/investigation';

/**
 * Maps tool execution from backend format to frontend ToolExecution
 * Handles both object format and string format (tool names)
 */
export function mapToolExecutions(backendTools: Array<any>): ToolExecution[] {
  if (!backendTools || !Array.isArray(backendTools)) {
    return [];
  }

  // Debug: Log raw backend data
  if (backendTools.length > 0) {
    console.log('🔧 [mapToolExecutions] Raw backend tools:', backendTools);
    console.log('🔧 [mapToolExecutions] First backend tool:', {
      fullTool: backendTools[0],
      keys: Object.keys(backendTools[0] || {}),
      type: typeof backendTools[0]
    });
  }

  return backendTools
    .filter(tool => tool != null) // Filter out null/undefined
    .map((tool, index) => {
      // Handle case where tool is just a string (tool name)
      if (typeof tool === 'string') {
        return {
          id: `tool-${index}-${tool}`,
          toolName: tool,
          agentType: 'unknown' as any,
          status: 'completed' as any,
          queuedAt: new Date(),
          startedAt: null,
          completedAt: null,
          executionTimeMs: 0,
          input: {
            entityId: '',
            entityType: '',
            parameters: {}
          },
          result: undefined,
          error: undefined,
          retryCount: 0,
          maxRetries: 3
        };
      }

      // Handle case where tool is an object
      const mapped = {
        id: tool.id || `tool-${index}`,
        toolId: tool.toolId || tool.tool_id || tool.id || `tool-${index}`,
        toolName: tool.toolName || tool.tool_name || tool.name || 'unknown',
        tool_name: tool.tool_name || tool.toolName || tool.name || 'unknown',
        agentType: (tool.agentType || tool.agent_type || 'unknown') as any,
        agent_type: tool.agent_type || tool.agentType || 'unknown',
        agentId: tool.agentId || tool.agent_id || tool.agentName || tool.agent_name || 'unknown',
        status: (tool.status || 'completed') as any,
        queuedAt: tool.queuedAt ? new Date(tool.queuedAt) : (tool.queued_at ? new Date(tool.queued_at) : new Date()),
        startedAt: tool.startedAt ? new Date(tool.startedAt) : (tool.started_at ? new Date(tool.started_at) : null),
        completedAt: tool.completedAt ? new Date(tool.completedAt) : (tool.completed_at ? new Date(tool.completed_at) : null),
        executionTimeMs: tool.executionTimeMs || tool.execution_time_ms || tool.execution_time || 0,
        executionTime: tool.executionTime || tool.executionTimeMs || tool.execution_time_ms || tool.execution_time || 0,
        description: tool.description || undefined,
        riskContribution: tool.riskContribution || tool.risk_contribution || 0,
        findings: tool.findings || tool.results || [],
        llm_thoughts: tool.llm_thoughts || tool.thoughts || tool.analysis || undefined,
        input: {
          entityId: tool.input?.entityId || tool.input?.entity_id || '',
          entityType: tool.input?.entityType || tool.input?.entity_type || '',
          parameters: tool.input?.parameters || tool.input || {}
        },
        result: tool.result || tool.output || undefined,
        error: tool.error || tool.error_message || undefined,
        retryCount: tool.retryCount || tool.retry_count || 0,
        maxRetries: tool.maxRetries || tool.max_retries || 3
      };

      // Debug: Log mapped tool if it's the first one
      if (index === 0) {
        console.log('🔧 [mapToolExecutions] Mapped tool:', {
          original: tool,
          mapped,
          executionTime: mapped.executionTime,
          findings: mapped.findings,
          llm_thoughts: mapped.llm_thoughts
        });
      }

      return mapped;
    });
}

/**
 * Maps agent statuses from backend format
 */
export function mapAgentStatuses(backendAgents: Array<any>): any[] {
  return backendAgents.map(agent => ({
    agentType: agent.agentType,
    agentName: agent.agentName,
    status: agent.status,
    toolsCompleted: agent.toolsCompleted,
    totalTools: agent.totalTools,
    progressPercent: agent.progressPercent,
    averageExecutionTimeMs: agent.averageExecutionTimeMs,
    findingsCount: agent.findingsCount,
    riskScore: agent.riskScore,
    maxRiskDetected: agent.maxRiskDetected,
    startedAt: agent.startedAt ? new Date(agent.startedAt) : null,
    completedAt: agent.completedAt ? new Date(agent.completedAt) : null
  }));
}

/**
 * Maps phases from backend format
 */
export function mapPhases(backendPhases: Array<any>): any[] {
  return backendPhases.map(phase => ({
    id: phase.id,
    name: phase.name,
    order: phase.order,
    status: phase.status,
    completionPercent: phase.completionPercent,
    toolExecutionIds: phase.toolExecutionIds,
    startedAt: phase.startedAt ? new Date(phase.startedAt) : null,
    completedAt: phase.completedAt ? new Date(phase.completedAt) : null,
    estimatedDurationMs: phase.estimatedDurationMs
  }));
}

/**
 * Maps entities from backend format
 */
export function mapEntities(backendEntities: Array<any>): any[] {
  return backendEntities.map(entity => ({
    id: entity.id,
    type: entity.type,
    value: entity.value,
    label: entity.label,
    metadata: entity.metadata,
    addedAt: new Date(entity.addedAt)
  }));
}

/**
 * Maps errors from backend format
 */
export function mapErrors(backendErrors: Array<any>): any[] {
  return backendErrors.map(error => ({
    id: error.id,
    code: error.code,
    message: error.message,
    timestamp: new Date(error.timestamp),
    severity: error.severity,
    context: error.context
  }));
}

/**
 * Maps backend status to frontend status enum
 */
export function mapBackendStatus(
  status: string
): 'pending' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' {
  const statusMap: Record<string, 'pending' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'> = {
    'pending': 'pending',
    'initializing': 'initializing',
    'running': 'running',
    'in_progress': 'running',
    'paused': 'paused',
    'completed': 'completed',
    'failed': 'failed',
    'cancelled': 'cancelled'
  };

  return statusMap[status.toLowerCase()] || 'pending';
}

/**
 * Maps backend lifecycle_stage to frontend lifecycle enum
 */
export function mapBackendLifecycleStage(
  stage: string
): 'draft' | 'submitted' | 'in_progress' | 'completed' | 'failed' {
  const stageMap: Record<string, 'draft' | 'submitted' | 'in_progress' | 'completed' | 'failed'> = {
    'draft': 'draft',
    'submitted': 'submitted',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'failed': 'failed'
  };

  return stageMap[stage.toLowerCase()] || 'draft';
}
