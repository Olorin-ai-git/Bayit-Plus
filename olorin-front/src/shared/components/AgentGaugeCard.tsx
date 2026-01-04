/**
 * AgentGaugeCard Component
 * Individual agent risk gauge card using HyperGauge for dual gauge display
 * Extracted from LuxGaugesDashboard for 200-line compliance
 */

import React from 'react';
import { HyperGauge } from './HyperGauge';
import {
  AgentRiskGaugeState,
  RiskThresholds,
  RiskColors,
  RiskZone,
} from '@shared/types/AgentRiskGauges';

export interface AgentGaugeCardProps {
  agent: AgentRiskGaugeState;
  riskThresholds: RiskThresholds;
  pulseThreshold: number;
  animationSpeed: number;
  colorScheme: RiskColors;
  onClick?: () => void;
  isRiskAgent?: boolean;
}

// Helper functions
function getRiskColor(value: number, thresholds: RiskThresholds, colors: RiskColors): string {
  if (value <= thresholds.low) return colors.low;
  if (value <= thresholds.medium) return colors.medium;
  return colors.high;
}

function getToolsColor(toolsUsed: number): string {
  const ratio = toolsUsed / 40;
  if (ratio > 0.75) return '#1d4ed8';
  if (ratio > 0.5) return '#2563eb';
  if (ratio > 0.25) return '#3b82f6';
  return '#60a5fa';
}

function getRiskLabel(value: number, thresholds: RiskThresholds): string {
  if (value <= thresholds.low) return 'LOW';
  if (value <= thresholds.medium) return 'MED';
  return 'HIGH';
}

export const AgentGaugeCard: React.FC<AgentGaugeCardProps> = ({
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
  const severe = agent.riskScore >= pulseThreshold;
  const riskLabel = getRiskLabel(agent.riskScore, riskThresholds);

  const zones: RiskZone[] = [
    { start: 0, end: riskThresholds.low, color: colorScheme.low, label: 'LOW' },
    {
      start: riskThresholds.low + 1,
      end: riskThresholds.medium,
      color: colorScheme.medium,
      label: 'MED',
    },
    {
      start: riskThresholds.medium + 1,
      end: 100,
      color: colorScheme.high,
      label: 'HIGH',
    },
  ];

  if (isRiskAgent) {
    return (
      <div className="bg-black border border-purple-500/40 rounded-lg p-6 max-w-md">
        <div className="flex flex-col items-center mb-4">
          <h3 className="text-lg font-medium text-purple-400 text-center">
            {agent.agentType.toUpperCase()} ASSESSMENT
          </h3>
          <div className="flex items-center gap-2 mt-2">
            {severe && (
              <span
                className="text-[10px] px-2 py-1 rounded-full font-semibold"
                style={{
                  background: '#ff3b30',
                  color: '#fff',
                  boxShadow: '0 0 10px #ff3b30',
                }}
              >
                SEVERE
              </span>
            )}
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                background: `${riskColor}22`,
                color: riskColor,
              }}
            >
              {riskLabel}
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <HyperGauge
            size={240}
            value={agent.riskScore}
            max={100}
            label="OVERALL RISK"
            color={riskColor}
            continuousFill
            warnPulse={severe}
            showZones
            zones={zones}
            needleMode="spring"
            animationMs={animationSpeed}
            valueFormatter={(v) => `${Math.round(v)}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-black border border-purple-500/30 rounded-lg p-4 transition-all ${onClick ? 'cursor-pointer hover:border-purple-400/50 hover:shadow-lg' : ''}`}
      onClick={onClick}
    >
      <div className="flex flex-col items-center mb-3">
        <h3 className="text-base font-medium text-purple-300 text-center">{agent.agentType}</h3>
        <div className="flex items-center gap-2 mt-2">
          {severe && (
            <span
              className="text-[10px] px-2 py-1 rounded-full font-semibold"
              style={{
                background: '#ff3b30',
                color: '#fff',
                boxShadow: '0 0 10px #ff3b30',
              }}
            >
              SEVERE
            </span>
          )}
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              background: `${riskColor}22`,
              color: riskColor,
            }}
          >
            {riskLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center">
          <HyperGauge
            size={180}
            value={agent.riskScore}
            max={100}
            label="RISK"
            color={riskColor}
            continuousFill
            warnPulse={severe}
            showZones={true}
            zones={zones}
            needleMode="spring"
            animationMs={animationSpeed}
            valueFormatter={(v) => `${Math.round(v)}`}
          />
        </div>

        <div className="flex flex-col items-center">
          <HyperGauge
            size={180}
            value={agent.toolsUsed}
            max={40}
            label="TOOLS"
            subtitle="0–40"
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

AgentGaugeCard.displayName = 'AgentGaugeCard';
