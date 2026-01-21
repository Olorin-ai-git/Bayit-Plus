/**
 * OverallToolsGaugeCard Component - Centered overall tools gauge
 * Displays the accumulated tools used during the investigation
 */

import React from 'react';
import { HyperGauge } from './HyperGauge';
import { AgentRiskGaugeState } from '@shared/types/AgentRiskGauges';

export interface OverallToolsGaugeCardProps {
  agents: AgentRiskGaugeState[];
  animationSpeed: number;
  onClick?: () => void;
}

export const OverallToolsGaugeCard: React.FC<OverallToolsGaugeCardProps> = ({
  agents,
  animationSpeed,
  onClick,
}) => {
  // Calculate total tools used across all agents
  const totalToolsUsed = agents.reduce((sum, agent) => sum + agent.toolsUsed, 0);
  const maxTools = 40 * agents.length; // Max possible tools (40 per agent)

  // Determine color based on usage percentage
  const usagePercent = maxTools > 0 ? (totalToolsUsed / maxTools) * 100 : 0;
  const toolsColor = usagePercent > 75
    ? '#1d4ed8'
    : usagePercent > 50
    ? '#2563eb'
    : usagePercent > 25
    ? '#3b82f6'
    : '#60a5fa';

  return (
    <div className="flex flex-col items-center gap-0 justify-center h-full">
      {/* Title */}
      <div className="text-sm font-semibold text-cyan-400 h-6 flex items-center mb-2">
        OVERALL TOOLS
      </div>

      {/* Tools Gauge - Large, centered, same dimensions as risk gauge */}
      <div
        className={`bg-black border border-blue-500/40 rounded-lg flex flex-col items-center justify-center transition-all w-full ${onClick ? 'cursor-pointer hover:border-blue-400/50' : ''}`}
        onClick={onClick}
        style={{ height: '280px', padding: '8px' }}
      >
        <div className="flex justify-center items-center flex-1">
          <HyperGauge
            size={200}
            value={totalToolsUsed}
            max={maxTools}
            label="OVERALL TOOLS"
            color={toolsColor}
            continuousFill
            needleMode="spring"
            animationMs={animationSpeed}
            valueFormatter={(v) => `${Math.round(v)}`}
          />
        </div>
      </div>
    </div>
  );
};

OverallToolsGaugeCard.displayName = 'OverallToolsGaugeCard';
