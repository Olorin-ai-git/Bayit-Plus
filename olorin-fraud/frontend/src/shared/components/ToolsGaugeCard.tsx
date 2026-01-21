/**
 * ToolsGaugeCard Component - Individual tools gauge for agents
 * Displays only the tools count gauge for each agent with label
 */

import React from 'react';
import { HyperGauge } from './HyperGauge';
import { AgentRiskGaugeState } from '@shared/types/AgentRiskGauges';

export interface ToolsGaugeCardProps {
  agent: AgentRiskGaugeState;
  animationSpeed: number;
  onClick?: () => void;
}

export const ToolsGaugeCard: React.FC<ToolsGaugeCardProps> = ({
  agent,
  animationSpeed,
  onClick,
}) => {
  const toolsColor = agent.toolsUsed / 40 > 0.75
    ? '#1d4ed8'
    : agent.toolsUsed / 40 > 0.5
    ? '#2563eb'
    : agent.toolsUsed / 40 > 0.25
    ? '#3b82f6'
    : '#60a5fa';

  return (
    <div
      className={`bg-black border border-blue-500/30 rounded-lg p-4 flex flex-col items-center transition-all ${onClick ? 'cursor-pointer hover:border-blue-400/50' : ''}`}
      onClick={onClick}
    >
      <span className="text-xs font-semibold text-gray-300 mb-3">{agent.agentType}</span>
      <div className="flex justify-center">
        <HyperGauge
          size={150}
          value={agent.toolsUsed}
          max={40}
          label="TOOLS"
          color={toolsColor}
          continuousFill
          needleMode="spring"
          animationMs={animationSpeed}
          valueFormatter={(v) => `${Math.round(v)}`}
        />
      </div>
    </div>
  );
};

ToolsGaugeCard.displayName = 'ToolsGaugeCard';
