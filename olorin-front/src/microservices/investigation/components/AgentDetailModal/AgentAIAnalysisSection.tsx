/**
 * Agent AI Analysis Section Component
 * Feature: 007-progress-wizard-page (T064)
 *
 * Displays overall AI assessment/LLM thoughts for the agent.
 */

import React from 'react';
import type { AgentRiskGaugeState } from '@shared/types/AgentRiskGauges';

interface AgentAIAnalysisSectionProps {
  agent: AgentRiskGaugeState;
}

export const AgentAIAnalysisSection: React.FC<AgentAIAnalysisSectionProps> = ({ agent }) => {
  const llmThoughts = (agent as any).llm_thoughts || (agent as any).thoughts || (agent as any).analysis;

  if (!llmThoughts) return null;

  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg border-l-4 border-blue-500 p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z" />
        </svg>
        <h4 className="font-semibold text-corporate-textPrimary">Overall AI Assessment</h4>
      </div>
      <div className="bg-black/30 backdrop-blur rounded-lg p-4 border border-blue-500/20">
        <p className="text-sm text-corporate-textSecondary whitespace-pre-wrap leading-relaxed">
          {llmThoughts}
        </p>
      </div>
    </div>
  );
};
