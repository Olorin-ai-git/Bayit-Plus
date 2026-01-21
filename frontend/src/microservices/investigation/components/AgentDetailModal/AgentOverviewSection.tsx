/**
 * Agent Overview Section Component
 * Feature: 007-progress-wizard-page (T064)
 *
 * Displays agent header with status, icon, and summary statistics.
 */

import React from 'react';
import { CpuChipIcon } from '@heroicons/react/24/outline';
import type { AgentRiskGaugeState } from '@shared/types/AgentRiskGauges';

interface AgentOverviewSectionProps {
  agent: AgentRiskGaugeState;
  completedTools: number;
  totalTools: number;
  totalFindings: number;
  riskColor: string;
}

export const AgentOverviewSection: React.FC<AgentOverviewSectionProps> = ({
  agent,
  completedTools,
  totalTools,
  totalFindings,
  riskColor
}) => {
  return (
    <div className="flex items-start gap-4">
      <div
        className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center border-2"
        style={{
          borderColor: riskColor,
          backgroundColor: `${riskColor}20`,
        }}
      >
        <CpuChipIcon className="w-8 h-8" style={{ color: riskColor }} />
      </div>
      <div className="flex-1">
        <h3 className="text-2xl font-bold text-corporate-textPrimary">
          {agent.agentType} Agent
        </h3>
        <p className="text-sm text-corporate-textSecondary mt-1">
          Status: <span className={`font-medium ${
            agent.status === 'running' ? 'text-blue-400' :
            agent.status === 'completed' ? 'text-green-400' :
            'text-gray-400'
          }`}>
            {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
          </span>
        </p>
        <p className="text-sm text-corporate-textSecondary mt-1">
          {completedTools} / {totalTools} tools completed • {totalFindings} findings detected
        </p>
      </div>
    </div>
  );
};
