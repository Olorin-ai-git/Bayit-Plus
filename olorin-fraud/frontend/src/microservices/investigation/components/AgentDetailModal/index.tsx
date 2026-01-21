/**
 * Agent Detail Modal Component
 * Feature: 007-progress-wizard-page (T064)
 *
 * Enhanced modal displaying comprehensive agent details with LLM thoughts/analysis.
 * Shows tool executions, findings, execution times, and risk contributions.
 * Main orchestrator that composes all sub-components.
 */

import React from 'react';
import { Modal } from '@shared/components/Modal';
import type { ToolExecution } from '@shared/types/investigation';
import type { AgentRiskGaugeState } from '@shared/types/AgentRiskGauges';
import { AgentOverviewSection } from './AgentOverviewSection';
import { AgentRiskSection } from './AgentRiskSection';
import { AgentAIAnalysisSection } from './AgentAIAnalysisSection';
import { AgentMetricsGrid } from './AgentMetricsGrid';
import { ToolExecutionsList } from './ToolExecutionsList';

export interface AgentDetailModalProps {
  agent: AgentRiskGaugeState;
  toolExecutions: ToolExecution[];
  isOpen: boolean;
  onClose: () => void;
}

function getRiskColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#06b6d4';
  return '#6b7280';
}

function getRiskLevel(score: number): string {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({
  agent,
  toolExecutions,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  // Filter tools executed by this agent
  const agentTools = toolExecutions.filter(tool =>
    tool.agentId === agent.agentName || tool.agent_type?.toLowerCase() === agent.agentType.toLowerCase()
  );

  // Calculate statistics
  const completedTools = agentTools.filter(t => t.status === 'completed').length;
  const totalFindings = agentTools.reduce((sum, tool) => sum + (tool.findings?.length || 0), 0);
  const avgExecutionTime = agentTools.length > 0
    ? agentTools.reduce((sum, tool) => sum + (tool.executionTime || 0), 0) / agentTools.length
    : 0;

  const riskColor = getRiskColor(agent.riskScore);
  const riskLevel = getRiskLevel(agent.riskScore);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${agent.agentType} Agent Analysis`}
      size="xl"
      closeOnBackdrop={true}
    >
      <div className="space-y-6">
        <AgentOverviewSection
          agent={agent}
          completedTools={completedTools}
          totalTools={agentTools.length}
          totalFindings={totalFindings}
          riskColor={riskColor}
        />

        <AgentRiskSection
          agent={agent}
          riskColor={riskColor}
          riskLevel={riskLevel}
        />

        <AgentAIAnalysisSection agent={agent} />

        <AgentMetricsGrid
          avgExecutionTime={avgExecutionTime}
          totalFindings={totalFindings}
          completedTools={completedTools}
          totalTools={agentTools.length}
        />

        {/* Tool Executions List */}
        <div className="bg-black/30 backdrop-blur rounded-lg border border-corporate-borderPrimary p-4">
          <h4 className="text-lg font-semibold text-corporate-textPrimary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-corporate-accentPrimary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            Tool Execution Details
          </h4>
          <ToolExecutionsList agentTools={agentTools} />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-corporate-borderPrimary">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium transition-all duration-200 shadow-lg hover:shadow-corporate-accentPrimary/50 hover:scale-105 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AgentDetailModal;
