/**
 * Progress Details Section
 * Feature: 004-new-olorin-frontend
 *
 * Stacked collapsible panels for phases and tool executions.
 * Live logs have been moved to the sidebar (LiveLogSidebar component).
 */

import React from 'react';
import {
  CollapsiblePanel,
  PhaseProgress,
  ToolExecutionCard
} from '@shared/components';
import type { Phase, ToolExecution, LogEntry } from '@shared/components';

interface ProgressDetailsSectionProps {
  phases: Phase[];
  currentPhaseId: string | null;
  toolExecutions: ToolExecution[];
  logs: LogEntry[];
}

export const ProgressDetailsSection: React.FC<ProgressDetailsSectionProps> = React.memo(({
  phases,
  currentPhaseId,
  toolExecutions,
  logs
}) => {
  const currentPhaseIndex = phases.findIndex(p => p.status === 'running');
  const completedToolsCount = toolExecutions.filter(t => t.status === 'completed').length;
  const runningToolsCount = toolExecutions.filter(t => t.status === 'running').length;

  return (
    <div className="space-y-6">
      {/* Phase Progress - Collapsible */}
      <CollapsiblePanel
        title="Investigation Phases"
        defaultExpanded={true}
        badges={[
          <span key="current" className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
            Phase {currentPhaseIndex + 1} / {phases.length}
          </span>
        ]}
      >
        <PhaseProgress phases={phases} currentPhaseId={currentPhaseId} />
      </CollapsiblePanel>

      {/* Tool Executions - Collapsible */}
      {toolExecutions.length > 0 && (
        <CollapsiblePanel
          title="Tool Execution Status"
          defaultExpanded={true}
          badges={[
            <span key="completed" className="text-xs px-2 py-1 bg-corporate-success/30 text-corporate-success rounded">
              {completedToolsCount} Completed
            </span>,
            <span key="running" className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">
              {runningToolsCount} Running
            </span>
          ]}
        >
          <div className="space-y-3">
            {toolExecutions.map((execution) => (
              <ToolExecutionCard key={execution.toolId} execution={execution} />
            ))}
          </div>
        </CollapsiblePanel>
      )}

      {/* Note: Live Logs have been moved to the sidebar (LiveLogSidebar component) */}
    </div>
  );
});
