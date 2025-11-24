/**
 * LuxGaugeCard Component
 * Individual agent risk gauge card with dual gauges (RISK + TOOLS)
 */

import React from 'react';
import { AgentRiskGaugeState, RiskThresholds, RiskColors } from '../types/agent.types';
import { getRiskColor, getToolsColor, isSevere, getRiskLabel } from '../utils/riskHelpers';

export interface LuxGaugeCardProps {
  agent: AgentRiskGaugeState;
  riskThresholds: RiskThresholds;
  pulseThreshold: number;
  animationSpeed: number;
  colorScheme: RiskColors;
  onClick?: () => void;
  isRiskAgent?: boolean;
}

export const LuxGaugeCard: React.FC<LuxGaugeCardProps> = ({
  agent,
  riskThresholds,
  pulseThreshold,
  animationSpeed,
  colorScheme,
  onClick,
  isRiskAgent = false,
}) => {
  const riskColor = getRiskColor(agent.riskScore, riskThresholds, colorScheme);
  const toolsColor = getToolsColor(agent.toolsUsed);
  const severe = isSevere(agent.riskScore, pulseThreshold);
  const riskLevel = getRiskLabel(agent.riskScore, riskThresholds);

  const containerClass = isRiskAgent
    ? 'bg-black/40 backdrop-blur-md border-2 border-corporate-borderAccent rounded-lg p-6 mb-6'
    : 'bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg p-4 mb-3';

  const titleClass = isRiskAgent ? 'text-2xl font-bold' : 'text-lg font-semibold';

  return (
    <div
      className={`${containerClass} ${onClick ? 'cursor-pointer hover:bg-black/30 backdrop-blur transition-colors' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${titleClass} text-corporate-textPrimary`}>{agent.agentName}</h3>
        <div className="flex items-center gap-2">
          {severe && (
            <span className="px-2 py-1 bg-red-900/30 border border-corporate-error rounded text-corporate-error text-xs font-bold animate-pulse">
              SEVERE
            </span>
          )}
          <span
            className="px-2 py-1 rounded text-xs font-bold"
            style={{
              backgroundColor: `${riskColor}20`,
              borderColor: riskColor,
              color: riskColor,
              borderWidth: '1px',
            }}
          >
            {riskLevel}
          </span>
        </div>
      </div>

      {/* Dual Gauges */}
      <div className={`grid ${isRiskAgent ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        {/* RISK Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#374151"
                strokeWidth="8"
              />
              {/* Risk arc */}
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={riskColor}
                strokeWidth="8"
                strokeDasharray={`${(agent.riskScore / 100) * 351.86} 351.86`}
                strokeLinecap="round"
                style={{
                  transition: `stroke-dasharray ${animationSpeed}ms ease-in-out`,
                }}
              />
            </svg>
            {/* Center value */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-corporate-textPrimary">
                {agent.riskScore}
              </span>
            </div>
          </div>
          <span className="text-sm text-corporate-textSecondary mt-2 font-medium">
            RISK
          </span>
        </div>

        {/* TOOLS Gauge (only for non-risk agents) */}
        {!isRiskAgent && (
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
              {/* Background circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="8"
                />
                {/* Tools arc (max 20 tools = 100%) */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={toolsColor}
                  strokeWidth="8"
                  strokeDasharray={`${(Math.min(agent.toolsUsed, 20) / 20) * 351.86} 351.86`}
                  strokeLinecap="round"
                  style={{
                    transition: `stroke-dasharray ${animationSpeed}ms ease-in-out`,
                  }}
                />
              </svg>
              {/* Center value */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-corporate-textPrimary">
                  {agent.toolsUsed}
                </span>
              </div>
            </div>
            <span className="text-sm text-corporate-textSecondary mt-2 font-medium">
              TOOLS
            </span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="mt-4 text-center">
        <span
          className={`text-sm font-medium ${
            agent.status === 'completed'
              ? 'text-corporate-success'
              : agent.status === 'running'
                ? 'text-cyan-400'
                : agent.status === 'failed'
                  ? 'text-corporate-error'
                  : 'text-gray-400'
          }`}
        >
          {agent.status.toUpperCase()}
        </span>
      </div>
    </div>
  );
};
