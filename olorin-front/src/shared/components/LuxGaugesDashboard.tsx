/**
 * LuxGaugesDashboard Component - Column-based gauge layout for agent risk and tools
 * Task: T020
 * Feature: 012-agents-risk-gauges
 *
 * Layout: Each agent as a vertical column with agent name -> risk gauge -> tools gauge.
 * Risk assessment gauge centered between the agent columns.
 */

import React from 'react';
import { AgentRiskGaugeState, RiskThresholds, RiskColors } from '@shared/types/AgentRiskGauges';
import { RiskGaugeCard } from '@microservices/visualization';
import { RiskAssessmentGaugeCard } from './RiskAssessmentGaugeCard';

export interface LuxGaugesDashboardProps {
  /** Array of agent data (1-6 agents) */
  agents: AgentRiskGaugeState[];
  /** Risk threshold configuration */
  riskThresholds: RiskThresholds;
  /** Pulse animation threshold (typically 90) */
  pulseThreshold: number;
  /** Animation duration in milliseconds */
  animationSpeed: number;
  /** Risk level color scheme */
  colorScheme: RiskColors;
  /** Optional click handler for agent drill-down (Feature 007, T064) */
  onAgentClick?: (agent: AgentRiskGaugeState) => void;
}

export const LuxGaugesDashboard: React.FC<LuxGaugesDashboardProps> = ({
  agents,
  riskThresholds,
  pulseThreshold,
  animationSpeed,
  colorScheme,
  onAgentClick,
}) => {
  // Find Risk Assessment Agent by matching display name (case-insensitive)
  // After mapping, agentType contains the display name, not the type code
  const riskAgent = agents.find((agent) =>
    agent.agentType.toLowerCase().includes('risk') &&
    agent.agentType.toLowerCase().includes('assessment')
  );
  const otherAgents = agents.filter((agent) =>
    !(agent.agentType.toLowerCase().includes('risk') &&
      agent.agentType.toLowerCase().includes('assessment'))
  );

  return (
    <div className="bg-black text-white border border-purple-600/30 rounded-lg p-4 space-y-4 w-full">
      {/* Responsive grid layout: Wraps gauges into multiple rows */}

      {/* Overall Risk gauge */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-4 border-b border-purple-600/20">
        {riskAgent && (
          <RiskAssessmentGaugeCard
            agent={riskAgent}
            riskThresholds={riskThresholds}
            pulseThreshold={pulseThreshold}
            animationSpeed={animationSpeed}
            colorScheme={colorScheme}
            onClick={() => onAgentClick?.(riskAgent)}
          />
        )}
      </div>

      {/* Risk gauges - Responsive grid that wraps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {otherAgents.map((agent) => (
          <RiskGaugeCard
            key={`${agent.agentType}-risk`}
            agent={agent}
            riskThresholds={riskThresholds}
            pulseThreshold={pulseThreshold}
            animationSpeed={animationSpeed}
            colorScheme={colorScheme}
            onClick={() => onAgentClick?.(agent)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="relative flex items-center justify-center gap-6 text-xs text-gray-400 border-t border-purple-600/20 pt-4">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: colorScheme.low }}
          />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: colorScheme.medium }}
          />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: colorScheme.high }}
          />
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

LuxGaugesDashboard.displayName = 'LuxGaugesDashboard';
