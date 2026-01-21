/**
 * AgentGaugeColumn Component - Vertical column layout for agent gauges
 * Displays agent name and risk gauge in a column
 */

import React from 'react';
import { RiskGaugeCard } from '@microservices/visualization';
import { AgentRiskGaugeState, RiskThresholds, RiskColors } from '@shared/types/AgentRiskGauges';

export interface AgentGaugeColumnProps {
  agent: AgentRiskGaugeState;
  riskThresholds: RiskThresholds;
  pulseThreshold: number;
  animationSpeed: number;
  colorScheme: RiskColors;
  onAgentClick?: (agent: AgentRiskGaugeState) => void;
}

export const AgentGaugeColumn: React.FC<AgentGaugeColumnProps> = ({
  agent,
  riskThresholds,
  pulseThreshold,
  animationSpeed,
  colorScheme,
  onAgentClick,
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Agent Name */}
      <div className="text-sm font-semibold text-purple-300 h-6 flex items-center">
        {agent.agentType}
      </div>

      {/* Risk Gauge */}
      <RiskGaugeCard
        agent={agent}
        riskThresholds={riskThresholds}
        pulseThreshold={pulseThreshold}
        animationSpeed={animationSpeed}
        colorScheme={colorScheme}
        onClick={() => onAgentClick?.(agent)}
      />
    </div>
  );
};

AgentGaugeColumn.displayName = 'AgentGaugeColumn';
