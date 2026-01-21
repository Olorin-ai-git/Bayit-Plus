/**
 * Agent Risk Assessment Section Component
 * Feature: 007-progress-wizard-page (T064)
 *
 * Displays risk assessment with score, level, and progress bar.
 */

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { AgentRiskGaugeState } from '@shared/types/AgentRiskGauges';

interface AgentRiskSectionProps {
  agent: AgentRiskGaugeState;
  riskColor: string;
  riskLevel: string;
}

export const AgentRiskSection: React.FC<AgentRiskSectionProps> = ({
  agent,
  riskColor,
  riskLevel
}) => {
  return (
    <div className="bg-gradient-to-br from-red-900/20 to-amber-900/20 rounded-lg border-l-4 p-4"
      style={{ borderLeftColor: riskColor }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5" style={{ color: riskColor }} />
          <span className="text-sm font-semibold text-corporate-textPrimary">
            Risk Assessment
          </span>
        </div>
        <span
          className="text-xl font-bold px-3 py-1 rounded"
          style={{
            color: riskColor,
            backgroundColor: `${riskColor}20`
          }}
        >
          {riskLevel}
        </span>
      </div>
      <div className="relative w-full h-4 bg-black/30 backdrop-blur rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
          style={{
            width: `${agent.riskScore}%`,
            backgroundColor: riskColor,
            boxShadow: `0 0 10px ${riskColor}80`
          }}
        />
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-corporate-textSecondary">
          Risk Score: {agent.riskScore}/100
        </span>
        <span className="text-xs text-corporate-textTertiary">
          Tools Used: {agent.toolsUsed}
        </span>
      </div>
    </div>
  );
};
