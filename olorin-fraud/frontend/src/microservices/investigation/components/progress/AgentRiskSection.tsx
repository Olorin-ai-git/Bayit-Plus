/**
 * Agent Risk Section
 * Feature: 004-new-olorin-frontend, enhanced in 007-progress-wizard-page (T064)
 *
 * Collapsible agent risk gauges dashboard with drill-down modal.
 */

import React from 'react';
import { CollapsiblePanel, LuxGaugesDashboard } from '@shared/components';
import { AgentDetailModal } from '../AgentDetailModal';
import type { AgentRiskGaugeState, RiskThresholds, RiskColors } from '@shared/types/AgentRiskGauges';
import type { ToolExecution } from '@shared/types/investigation';

interface AgentRiskSectionProps {
  agentGauges: AgentRiskGaugeState[];
  toolExecutions: ToolExecution[];
  riskThresholds: RiskThresholds;
  pulseThreshold: number;
  animationSpeed: number;
  colorScheme: RiskColors;
}

export const AgentRiskSection: React.FC<AgentRiskSectionProps> = React.memo(({
  agentGauges,
  toolExecutions,
  riskThresholds,
  pulseThreshold,
  animationSpeed,
  colorScheme
}) => {
  const [selectedAgent, setSelectedAgent] = React.useState<AgentRiskGaugeState | null>(null);

  if (agentGauges.length === 0) {
    return null;
  }

  const activeCount = agentGauges.filter(a => a.status === 'running').length;

  return (
    <>
      <CollapsiblePanel
        title="Agent Risk Analysis"
        defaultExpanded={true}
        badges={[
          <span key="agents" className="text-xs px-2 py-1 bg-amber-900/30 text-amber-400 rounded">
            {activeCount} / {agentGauges.length} Active
          </span>
        ]}
        className="mb-6"
      >
        <LuxGaugesDashboard
          agents={agentGauges}
          riskThresholds={riskThresholds}
          pulseThreshold={pulseThreshold}
          animationSpeed={animationSpeed}
          colorScheme={colorScheme}
          onAgentClick={setSelectedAgent}
        />
      </CollapsiblePanel>

      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          toolExecutions={toolExecutions}
          isOpen={true}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </>
  );
});
