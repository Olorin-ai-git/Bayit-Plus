/**
 * Agent Metrics Grid Component
 * Feature: 007-progress-wizard-page (T064)
 *
 * Displays agent metrics in a 3-column grid.
 */

import React from 'react';
import { ClockIcon, ChartBarIcon, CpuChipIcon } from '@heroicons/react/24/outline';

interface AgentMetricsGridProps {
  avgExecutionTime: number;
  totalFindings: number;
  completedTools: number;
  totalTools: number;
}

function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export const AgentMetricsGrid: React.FC<AgentMetricsGridProps> = ({
  avgExecutionTime,
  totalFindings,
  completedTools,
  totalTools
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-black/30 backdrop-blur rounded-lg border border-corporate-borderPrimary p-4">
        <div className="flex items-center gap-2 mb-2">
          <ClockIcon className="w-5 h-5 text-corporate-accentSecondary" />
          <span className="text-xs font-semibold text-corporate-textSecondary">
            Avg Execution Time
          </span>
        </div>
        <p className="text-2xl font-bold text-corporate-textPrimary">
          {formatExecutionTime(avgExecutionTime)}
        </p>
      </div>

      <div className="bg-black/30 backdrop-blur rounded-lg border border-corporate-borderPrimary p-4">
        <div className="flex items-center gap-2 mb-2">
          <ChartBarIcon className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-semibold text-corporate-textSecondary">
            Total Findings
          </span>
        </div>
        <p className="text-2xl font-bold text-corporate-textPrimary">
          {totalFindings}
        </p>
      </div>

      <div className="bg-black/30 backdrop-blur rounded-lg border border-corporate-borderPrimary p-4">
        <div className="flex items-center gap-2 mb-2">
          <CpuChipIcon className="w-5 h-5 text-purple-400" />
          <span className="text-xs font-semibold text-corporate-textSecondary">
            Tools Executed
          </span>
        </div>
        <p className="text-2xl font-bold text-corporate-textPrimary">
          {completedTools} / {totalTools}
        </p>
      </div>
    </div>
  );
};
