import React from 'react';
import { LuxGaugesDashboard } from '../../../shared/components';
import type { AgentRiskGaugeState, RiskConfiguration } from '../../../shared/types/AgentRiskGauges';

interface AgentPerformanceSectionProps {
  agentGauges: AgentRiskGaugeState[];
  riskConfig: RiskConfiguration;
}

export const AgentPerformanceSection: React.FC<AgentPerformanceSectionProps> = ({
  agentGauges,
  riskConfig
}) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-200 mb-6">
        Agent Performance & Risk Analysis
      </h2>
      <LuxGaugesDashboard
        agents={agentGauges}
        riskThresholds={riskConfig.thresholds}
        pulseThreshold={riskConfig.thresholds.pulse}
        animationSpeed={riskConfig.animationSpeed}
        colorScheme={riskConfig.colors}
      />
    </div>
  );
};

export default AgentPerformanceSection;
