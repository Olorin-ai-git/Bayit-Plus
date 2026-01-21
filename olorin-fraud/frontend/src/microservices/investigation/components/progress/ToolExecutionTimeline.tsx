/**
 * Tool Execution Timeline
 * Feature: 006-hybrid-graph-integration
 *
 * Displays chronological tool execution timeline with status badges.
 * Shows pending, running, completed, and failed tool calls.
 */

import React from 'react';

interface ToolExecution {
  tool_id: string;
  tool_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  output_summary?: string;
  error_message?: string;
}

interface ToolExecutionTimelineProps {
  toolExecutions: ToolExecution[];
  className?: string;
}

export function ToolExecutionTimeline({
  toolExecutions,
  className = '',
}: ToolExecutionTimelineProps) {
  const getStatusBadge = (status: ToolExecution['status']) => {
    const styles = {
      pending: 'bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40/50 text-corporate-textSecondary',
      running: 'bg-blue-500/20 text-blue-300 animate-pulse border border-blue-500/50',
      completed: 'bg-green-500/20 text-green-300 border border-corporate-success/50',
      failed: 'bg-red-500/20 text-red-300 border border-corporate-error/50',
    };

    const icons = {
      pending: '⏳',
      running: '▶️',
      completed: '✓',
      failed: '✗',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${styles[status]}`}>
        <span className="mr-1">{icons[status]}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDuration = (durationMs?: number): string => {
    if (!durationMs) return 'N/A';
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(2)}s`;
  };

  const formatTime = (isoTime: string): string => {
    try {
      const date = new Date(isoTime);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Invalid time';
    }
  };

  if (toolExecutions.length === 0) {
    return (
      <div className={`bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
          Tool Execution Timeline
        </h3>
        <p className="text-corporate-textSecondary text-center py-8">
          No tool executions yet. Waiting for investigation to start...
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-corporate-textPrimary">
          Tool Execution Timeline
        </h3>
        <span className="text-sm text-corporate-textTertiary">
          {toolExecutions.length} tool{toolExecutions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {toolExecutions.map((execution, index) => (
          <div
            key={`${execution.tool_id}-${index}`}
            className="p-4 bg-black/50 backdrop-blur border-2 border-corporate-borderSecondary/40 rounded-md"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-corporate-textPrimary">{execution.tool_name}</h4>
                <p className="text-xs text-corporate-textTertiary mt-1">
                  Started: {formatTime(execution.started_at)}
                  {execution.completed_at && ` • Completed: ${formatTime(execution.completed_at)}`}
                  {execution.duration_ms && ` • Duration: ${formatDuration(execution.duration_ms)}`}
                </p>
              </div>
              <div className="ml-4">{getStatusBadge(execution.status)}</div>
            </div>

            {execution.output_summary && execution.status === 'completed' && (
              <p className="text-sm text-corporate-textSecondary mt-2">
                {execution.output_summary}
              </p>
            )}

            {execution.error_message && execution.status === 'failed' && (
              <p className="text-sm text-corporate-error mt-2">
                Error: {execution.error_message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
