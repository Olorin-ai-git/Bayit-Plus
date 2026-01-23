/**
 * RiskAssessmentGaugeCard Component - Centered risk assessment gauge
 * Displays the overall risk assessment gauge (Risk agent type) in a column with spacing
 */

import React from 'react';
import { HyperGauge } from './HyperGauge';
import { AgentRiskGaugeState, RiskThresholds, RiskColors } from '../../types/AgentRiskGauges';

export interface RiskAssessmentGaugeCardProps {
  agent: AgentRiskGaugeState;
  riskThresholds: RiskThresholds;
  pulseThreshold: number;
  animationSpeed: number;
  colorScheme: RiskColors;
  onClick?: () => void;
}

export const RiskAssessmentGaugeCard: React.FC<RiskAssessmentGaugeCardProps> = ({
  agent,
  riskThresholds,
  pulseThreshold,
  animationSpeed,
  colorScheme,
  onClick,
}) => {
  const riskColor = agent.riskScore <= riskThresholds.low
    ? colorScheme.low
    : agent.riskScore <= riskThresholds.medium
    ? colorScheme.medium
    : colorScheme.high;
  const severe = agent.riskScore >= pulseThreshold;

  return (
    <div className="flex flex-col items-center gap-0 justify-center h-full">
      {/* Agent Name / Title */}
      <div className="text-sm font-semibold text-purple-400 h-6 flex items-center mb-2">
        OVERALL RISK
      </div>

      {/* Risk Gauge - Large, centered, spans both rows */}
      <div
        className={`bg-black border border-purple-500/40 rounded-lg flex flex-col items-center justify-center transition-all w-full ${onClick ? 'cursor-pointer hover:border-purple-400/50' : ''}`}
        onClick={onClick}
        style={{ height: '280px', padding: '8px' }}
      >
        {severe && (
          <span
            className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold mb-1"
            style={{
              background: '#ff3b30',
              color: '#fff',
              boxShadow: '0 0 8px #ff3b30',
            }}
          >
            SEVERE
          </span>
        )}
        <div className="flex justify-center items-center flex-1">
          <HyperGauge
            size={200}
            value={agent.riskScore}
            max={100}
            label="OVERALL RISK"
            color={riskColor}
            continuousFill
            warnPulse={severe}
            needleMode="spring"
            animationMs={animationSpeed}
            valueFormatter={(v) => `${Math.round(v)}`}
          />
        </div>
      </div>
    </div>
  );
};

RiskAssessmentGaugeCard.displayName = 'RiskAssessmentGaugeCard';
