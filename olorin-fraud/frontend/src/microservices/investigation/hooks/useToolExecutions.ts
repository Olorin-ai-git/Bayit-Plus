/**
 * Tool Executions Hook
 * Feature: 004-new-olorin-frontend
 *
 * Manages tool execution states during investigation.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ToolExecution, LogEntry } from '@shared/components';
import type { WizardSettings } from '@shared/types/wizard.types';

/**
 * Hook to manage tool executions
 */
export function useToolExecutions(
  settings: WizardSettings | null,
  addLog: (log: LogEntry) => void
) {
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);

  // Initialize tool executions from settings
  useEffect(() => {
    if (!settings) return;

    const enabledTools = (settings.tools || []).filter((t) => t.isEnabled);
    const initialExecutions: ToolExecution[] = enabledTools.map((tool) => ({
      toolId: tool.toolId,
      toolName: tool.toolName,
      status: 'pending'
    }));
    setToolExecutions(initialExecutions);
  }, [settings]);

  // Update tool execution status
  const updateToolStatus = useCallback((
    toolId: string,
    status: ToolExecution['status'],
    error?: string
  ) => {
    setToolExecutions((prev) => {
      const updated = prev.map((execution) => {
        if (execution.toolId === toolId) {
          const updatedExecution = { ...execution, status };
          if (error) {
            updatedExecution.error = error;
          }

          // Log status change
          const log: LogEntry = {
            timestamp: new Date().toISOString(),
            level: status === 'failed' ? 'error' : 'info',
            message: `Tool "${execution.toolName}" ${status}${error ? `: ${error}` : ''}`,
            source: 'tool_executor'
          };
          addLog(log);

          return updatedExecution;
        }
        return execution;
      });
      return updated;
    });
  }, [addLog]);

  return { toolExecutions, updateToolStatus };
}
