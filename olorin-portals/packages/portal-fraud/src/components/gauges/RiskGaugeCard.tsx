/**
 * RiskGaugeCard Component - Individual risk gauge card for agents
 * Moved from: /Users/gklainert/Documents/olorin/olorin-front/src/shared/components/RiskGaugeCard.tsx
 *
 * Displays only the risk score gauge for each agent with label.
 * Updated to use local imports from visualization microservice.
 *
 * NO HARDCODED VALUES - All configuration from props/environment.
 * File size compliant: <200 lines
 */

import React from 'react';
import { HyperGauge } from './HyperGauge';
import { AgentRiskGaugeState, RiskThresholds, RiskColors } from '../../types/AgentRiskGauges';

export interface RiskGaugeCardProps {
  /** Agent state data */
  agent: AgentRiskGaugeState;

  /** Risk threshold configuration */
  riskThresholds: RiskThresholds;

  /** Pulse animation threshold */
  pulseThreshold: number;

  /** Animation speed in milliseconds */
  animationSpeed: number;

  /** Color scheme for risk levels */
  colorScheme: RiskColors;

  /** Optional click handler */
  onClick?: () => void;
}

/**
 * RiskGaugeCard - Individual agent risk gauge display
 */
export const RiskGaugeCard: React.FC<RiskGaugeCardProps> = ({
  agent,
  riskThresholds,
  pulseThreshold,
  animationSpeed,
  colorScheme,
  onClick,
}) => {
  const riskColor =
    agent.riskScore <= riskThresholds.low
      ? colorScheme.low
      : agent.riskScore <= riskThresholds.medium
      ? colorScheme.medium
      : colorScheme.high;

  const severe = agent.riskScore >= pulseThreshold;

  return (
    <div
      className={`bg-black border border-purple-500/30 rounded-lg p-4 flex flex-col items-center transition-all ${
        onClick ? 'cursor-pointer hover:border-purple-400/50' : ''
      }`}
      onClick={onClick}
    >
      <span className="text-xs font-semibold text-gray-300 mb-3">{agent.agentType}</span>
      {severe && (
        <span
          className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold mb-2"
          style={{
            background: '#ff3b30',
            color: '#fff',
            boxShadow: '0 0 8px #ff3b30',
          }}
        >
          SEVERE
        </span>
      )}
      <div className="flex justify-center">
        <HyperGauge
          size={150}
          value={agent.riskScore}
          max={100}
          label="RISK"
          color={riskColor}
          continuousFill
          warnPulse={severe}
          needleMode="spring"
          animationMs={animationSpeed}
          valueFormatter={(v) => `${Math.round(v)}`}
        />
      </div>
    </div>
  );
};

RiskGaugeCard.displayName = 'RiskGaugeCard';
