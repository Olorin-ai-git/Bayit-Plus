/**
 * ICE Event Types
 * Type definitions for ICE WebSocket events
 * Feature: 012-agents-risk-gauges
 */

/**
 * Tool execution event from ICE TOOL_EXECUTIONS topic
 */
export interface ToolExecutionEvent {
  event_type: 'tool_execution_complete' | 'tool_execution_failed';
  data: {
    tool_id: string;
    agent_name: string;
    tool_name: string;
    status: 'completed' | 'failed';
    timestamp: number; // Unix epoch ms
    execution_time_ms: number;
  };
}

/**
 * Agent results event from ICE AGENT_RESULTS topic
 */
export interface AgentResultsEvent {
  event_type: 'agent_risk_update' | 'agent_complete';
  data: {
    agent_name: string; // Maps to AgentType via mapAgentNameToType()
    risk_score: number; // 0-100
    tools_executed: number; // 0-40
    execution_time_ms: number;
    findings_count: number;
    status: 'running' | 'completed' | 'failed';
  };
}

/**
 * Progress update event from ICE PROGRESS_UPDATES topic
 */
export interface ProgressUpdateEvent {
  event_type: 'progress_update';
  data: {
    overall_progress: number; // 0-100
    completed_count: number;
    running_count: number;
    queued_count: number;
    failed_count: number;
    status: 'initializing' | 'running' | 'completed' | 'failed';
  };
}
