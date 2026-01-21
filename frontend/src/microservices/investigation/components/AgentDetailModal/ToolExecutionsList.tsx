/**
 * Tool Executions List Component
 * Feature: 007-progress-wizard-page (T064)
 *
 * Displays list of tool executions for an agent with comprehensive details.
 */

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { ToolExecution } from '@shared/types/investigation';

interface ToolExecutionsListProps {
  agentTools: ToolExecution[];
}

function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function getRiskColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#06b6d4';
  return '#6b7280';
}

function getStatusBadge(status: ToolExecution['status']): { bg: string; text: string; label: string } {
  const badges = {
    queued: { bg: 'bg-gray-800/50', text: 'text-gray-400', label: 'Queued' },
    running: { bg: 'bg-blue-900/30', text: 'text-blue-400', label: 'Running' },
    completed: { bg: 'bg-corporate-success/30', text: 'text-corporate-success', label: 'Completed' },
    failed: { bg: 'bg-red-900/30', text: 'text-corporate-error', label: 'Failed' }
  };
  return badges[status] || badges.queued;
}

export const ToolExecutionsList: React.FC<ToolExecutionsListProps> = ({ agentTools }) => {
  // Debug: Log the tool data structure
  React.useEffect(() => {
    if (agentTools.length > 0) {
      console.log('🔍 [ToolExecutionsList] Received agentTools:', agentTools);
      console.log('🔍 [ToolExecutionsList] First tool structure:', {
        fullTool: agentTools[0],
        keys: Object.keys(agentTools[0]),
        executionTime: agentTools[0].executionTime,
        executionTimeMs: (agentTools[0] as any).executionTimeMs,
        findings: agentTools[0].findings,
        llm_thoughts: (agentTools[0] as any).llm_thoughts,
        thoughts: (agentTools[0] as any).thoughts,
        analysis: (agentTools[0] as any).analysis,
        riskContribution: (agentTools[0] as any).riskContribution
      });
    }
  }, [agentTools]);

  if (agentTools.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-corporate-textTertiary">No tools executed by this agent yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {agentTools.map((tool) => {
        const statusBadge = getStatusBadge(tool.status);
        const findingsCount = tool.findings?.length || 0;
        const toolRisk = tool.riskContribution || 0;
        const toolRiskColor = getRiskColor(toolRisk);
        const llmThoughts = (tool as any).llm_thoughts || (tool as any).thoughts || (tool as any).analysis;

        // Check if this is a minimal tool object (backend only sent tool name)
        const isMinimalData = !tool.executionTime && !llmThoughts && findingsCount === 0;

        return (
          <div
            key={tool.toolId || tool.id}
            className="bg-corporate-bgSecondary border border-corporate-borderPrimary rounded-lg p-4 hover:border-corporate-accentPrimary/50 transition-all"
          >
            {/* Tool Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h5 className="text-base font-semibold text-corporate-textPrimary">
                  {tool.toolName || tool.tool_name}
                </h5>
                {tool.description && (
                  <p className="text-sm text-corporate-textSecondary mt-1">{tool.description}</p>
                )}
                {isMinimalData && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Limited data available (backend sends tool name only)
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border border-current/30`}>
                {statusBadge.label}
              </span>
            </div>

            {/* Tool Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col">
                <span className="text-xs text-corporate-textTertiary mb-1">Execution Time</span>
                <span className="text-sm font-medium text-corporate-textSecondary">
                  {tool.executionTime ? formatExecutionTime(tool.executionTime) : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-corporate-textTertiary mb-1">Findings</span>
                <span className="text-sm font-medium text-corporate-textSecondary">
                  {findingsCount} detected
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-corporate-textTertiary mb-1">Risk Impact</span>
                <span className="text-sm font-medium" style={{ color: toolRiskColor }}>
                  {toolRisk}/100
                </span>
              </div>
            </div>

            {/* LLM Analysis / AI Thoughts */}
            {llmThoughts && (
              <div className="border-t border-corporate-borderPrimary pt-3 mt-3">
                <h6 className="text-sm font-medium text-corporate-textPrimary mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z" />
                  </svg>
                  AI Analysis
                </h6>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm text-corporate-textSecondary whitespace-pre-wrap leading-relaxed">
                    {llmThoughts}
                  </p>
                </div>
              </div>
            )}

            {/* Findings List */}
            {findingsCount > 0 && (
              <div className="border-t border-corporate-borderPrimary pt-3 mt-3">
                <h6 className="text-sm font-medium text-corporate-textPrimary mb-2 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" />
                  Findings ({findingsCount})
                </h6>
                <ul className="space-y-1.5">
                  {tool.findings?.map((finding, idx) => (
                    <li key={idx} className="text-sm text-corporate-textSecondary pl-4 flex items-start gap-2">
                      <span className="text-corporate-accentPrimary mt-0.5">•</span>
                      <span>{finding.description || finding.type || JSON.stringify(finding)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
