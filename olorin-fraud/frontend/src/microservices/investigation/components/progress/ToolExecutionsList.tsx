/**
 * Tool Executions List Component
 * Feature: 008-live-investigation-updates (US1 Real-Time Progress)
 *
 * Displays real-time tool execution status, results, and errors.
 * Updates as tools complete.
 */

import React, { useMemo } from 'react';
import {
  ToolExecution
} from '../../../../shared/types/investigation';
import './ToolExecutionsList.css';

export interface ToolExecutionsListProps {
  executions: ToolExecution[];
  isLoading?: boolean;
  maxItems?: number;
  sortBy?: 'newest' | 'oldest' | 'status';
}

/**
 * Get status badge color and icon
 */
function getStatusBadge(status: string): { icon: string; color: string; text: string } {
  switch (status) {
    case 'completed':
      return { icon: '✓', color: 'status-completed', text: 'Completed' };
    case 'running':
      return { icon: '⟳', color: 'status-running', text: 'Running' };
    case 'queued':
      return { icon: '⋯', color: 'status-queued', text: 'Queued' };
    case 'pending':
      return { icon: '⋯', color: 'status-pending', text: 'Pending' };
    case 'failed':
      return { icon: '✕', color: 'status-failed', text: 'Failed' };
    case 'skipped':
      return { icon: '⊘', color: 'status-skipped', text: 'Skipped' };
    default:
      return { icon: '?', color: 'status-unknown', text: status };
  }
}

/**
 * Format duration in milliseconds to readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

/**
 * Tool Executions List Component
 */
export const ToolExecutionsList: React.FC<ToolExecutionsListProps> = ({
  executions,
  isLoading = false,
  maxItems = 10,
  sortBy = 'newest'
}) => {
  // Sort executions
  const sortedExecutions = useMemo(() => {
    const items = [...executions];

    switch (sortBy) {
      case 'oldest':
        return items.sort(
          (a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime()
        );
      case 'status':
        const statusOrder = { running: 0, pending: 1, queued: 2, completed: 3, failed: 4, skipped: 5 };
        return items.sort((a, b) => {
          const aOrder = statusOrder[a.status as keyof typeof statusOrder] || 99;
          const bOrder = statusOrder[b.status as keyof typeof statusOrder] || 99;
          return aOrder - bOrder;
        });
      case 'newest':
      default:
        return items.sort(
          (a, b) => new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime()
        );
    }
  }, [executions, sortBy]);

  // Limit items
  const displayedExecutions = useMemo(
    () => sortedExecutions.slice(0, maxItems),
    [sortedExecutions, maxItems]
  );

  if (isLoading) {
    return (
      <div className="tool-executions-loading">
        <div className="loading-spinner" />
        <span>Loading tool executions...</span>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="tool-executions-empty">
        <span>No tools executed yet</span>
      </div>
    );
  }

  return (
    <div className="tool-executions-list">
      <div className="tool-executions-header">
        <span className="tool-executions-title">
          Tool Executions ({executions.length})
        </span>
        {executions.length > maxItems && (
          <span className="tool-executions-more">
            +{executions.length - maxItems} more
          </span>
        )}
      </div>

      <div className="tool-executions-items">
        {displayedExecutions.map((execution) => {
          const badge = getStatusBadge(execution.status);
          const duration = execution.executionTimeMs > 0
            ? formatDuration(execution.executionTimeMs)
            : '—';

          return (
            <div key={execution.id} className="tool-execution-item">
              {/* Status Badge */}
              <div className={`tool-status-badge ${badge.color}`}>
                <span className="badge-icon">{badge.icon}</span>
              </div>

              {/* Tool Info */}
              <div className="tool-info">
                <div className="tool-name">
                  {execution.toolName}
                  <span className="tool-agent">
                    {execution.agentType}
                  </span>
                </div>

                <div className="tool-meta">
                  <span className="meta-item">
                    {new Date(execution.queuedAt).toLocaleTimeString()}
                  </span>
                  {duration !== '—' && (
                    <span className="meta-item">
                      Duration: {duration}
                    </span>
                  )}
                </div>
              </div>

              {/* Result Info */}
              <div className="tool-result">
                {execution.result && (
                  <>
                    {execution.result.findings && execution.result.findings.length > 0 && (
                      <span className="findings-badge">
                        {execution.result.findings.length} finding{execution.result.findings.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {(execution.result.riskScore !== undefined || execution.result.risk !== undefined) && (
                      <span className="risk-badge">
                        Risk: {((execution.result.riskScore || execution.result.risk || 0) * 100).toFixed(0)}%
                      </span>
                    )}
                  </>
                )}

                {execution.error && (
                  <span className="error-badge" title={execution.error.message}>
                    Error: {execution.error.code}
                  </span>
                )}
              </div>

              {/* Status Text */}
              <div className="tool-status-text">
                {badge.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

ToolExecutionsList.displayName = 'ToolExecutionsList';

