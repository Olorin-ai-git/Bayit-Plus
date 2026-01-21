/**
 * Demo Scenario Card Component
 *
 * Displays a selectable fraud scenario card for the interactive demo.
 */

import React from 'react';
import { DemoScenario } from '../../services/demoApiService';

interface DemoScenarioCardProps {
  scenario: DemoScenario;
  isSelected: boolean;
  onSelect: (scenario: DemoScenario) => void;
}

const getRiskLevelStyles = (riskLevel: string): string => {
  switch (riskLevel.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-corporate-error/20 text-corporate-error border-corporate-error/50';
    case 'HIGH':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    case 'MEDIUM-HIGH':
      return 'bg-corporate-warning/20 text-corporate-warning border-corporate-warning/50';
    case 'MEDIUM':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    default:
      return 'bg-corporate-success/20 text-corporate-success border-corporate-success/50';
  }
};

const getScenarioIcon = (type: string): string => {
  switch (type) {
    case 'device_spoofing':
      return '🖥️';
    case 'impossible_travel':
      return '✈️';
    case 'account_takeover':
      return '🔐';
    case 'payment_fraud':
      return '💳';
    default:
      return '🔍';
  }
};

export const DemoScenarioCard: React.FC<DemoScenarioCardProps> = ({
  scenario,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      onClick={() => onSelect(scenario)}
      className={`
        w-full text-left p-6 rounded-xl transition-all duration-300
        ${
          isSelected
            ? 'glass-card border-2 border-corporate-accentPrimary shadow-lg shadow-corporate-accentPrimary/20'
            : 'glass-card border border-white/10 hover:border-corporate-accentPrimary/50 hover:shadow-lg hover-lift'
        }
      `}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{getScenarioIcon(scenario.type)}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-corporate-textPrimary">{scenario.title}</h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelStyles(
                scenario.risk_level
              )}`}
            >
              {scenario.risk_level}
            </span>
          </div>
          <p className="text-corporate-textSecondary text-sm mb-4">{scenario.description}</p>

          <div className="flex flex-wrap gap-2">
            {scenario.showcase_agents.map((agent) => (
              <span
                key={agent}
                className="px-2 py-1 bg-corporate-accentPrimary/10 text-corporate-accentTertiary text-xs rounded-md"
              >
                {agent}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {Object.entries(scenario.display_data).map(([key, value]) => (
              <div key={key}>
                <span className="text-corporate-textMuted capitalize">{key.replace(/_/g, ' ')}</span>
                <p className="text-corporate-textPrimary font-medium">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  );
};

export default DemoScenarioCard;
