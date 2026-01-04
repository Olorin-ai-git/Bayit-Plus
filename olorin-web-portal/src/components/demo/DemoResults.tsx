/**
 * Demo Results Component
 *
 * Displays the final results of the demo investigation
 * including risk score and agent findings.
 */

import React from 'react';
import { DemoScenario, DemoStatusResponse } from '../../services/demoApiService';
import { DemoRiskGauge } from './DemoRiskGauge';

interface DemoResultsProps {
  status: DemoStatusResponse;
  scenario: DemoScenario;
  onReset: () => void;
  onContactSales: () => void;
}

const getRiskLevelScore = (riskLevel: string): number => {
  switch (riskLevel.toUpperCase()) {
    case 'CRITICAL':
      return 95;
    case 'HIGH':
      return 78;
    case 'MEDIUM-HIGH':
      return 65;
    case 'MEDIUM':
      return 50;
    case 'LOW':
      return 25;
    default:
      return 50;
  }
};

const getRiskLevelStyles = (riskLevel: string): string => {
  switch (riskLevel.toUpperCase()) {
    case 'CRITICAL':
      return 'text-corporate-error bg-corporate-error/10 border-corporate-error/30';
    case 'HIGH':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'MEDIUM-HIGH':
    case 'MEDIUM':
      return 'text-corporate-warning bg-corporate-warning/10 border-corporate-warning/30';
    default:
      return 'text-corporate-success bg-corporate-success/10 border-corporate-success/30';
  }
};

export const DemoResults: React.FC<DemoResultsProps> = ({
  status,
  scenario,
  onReset,
  onContactSales,
}) => {
  const overallScore = getRiskLevelScore(scenario.risk_level);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-corporate-success/20 flex items-center justify-center">
            <span className="text-2xl">✅</span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-corporate-textPrimary">Investigation Complete</h3>
            <p className="text-corporate-textSecondary">
              Our AI agents have analyzed the {scenario.title.toLowerCase()} scenario
            </p>
          </div>
        </div>
      </div>

      {/* Risk Score and Agent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Gauge */}
        <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-center">
          <DemoRiskGauge score={overallScore} label="Overall Risk Score" size="lg" />
        </div>

        {/* Agent Findings */}
        <div className="lg:col-span-2 glass-card p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-corporate-textPrimary mb-4">Agent Findings</h4>
          <div className="space-y-3">
            {Object.entries(status.agent_results).map(([agentKey, result]) => (
              <div
                key={agentKey}
                className={`p-4 rounded-lg border ${getRiskLevelStyles(result.risk_level)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium capitalize">
                      {agentKey.replace(/_/g, ' ')}
                    </span>
                    <span className="ml-2 text-sm opacity-75">
                      {Math.round(result.confidence * 100)}% confidence
                    </span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-black/20">
                    {result.risk_level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="glass-card p-6 rounded-xl">
        <h4 className="text-lg font-semibold text-corporate-textPrimary mb-4">Key Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(scenario.display_data).map(([key, value]) => (
            <div key={key} className="p-4 bg-white/5 rounded-lg">
              <span className="text-corporate-textMuted text-sm capitalize">{key.replace(/_/g, ' ')}</span>
              <p className="text-corporate-textPrimary font-medium mt-1">{String(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="glass-card p-6 rounded-xl bg-gradient-to-r from-corporate-accentPrimary/10 to-corporate-accentSecondary/10 border-corporate-accentPrimary/30">
        <div className="text-center">
          <h4 className="text-xl font-semibold text-corporate-textPrimary mb-2">
            See the Full Platform in Action
          </h4>
          <p className="text-corporate-textSecondary mb-6">
            This demo shows just a fraction of Olorin&apos;s capabilities. Schedule a personalized
            demo to see how we can protect your business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onContactSales}
              className="px-6 py-3 bg-corporate-accentPrimary hover:bg-corporate-accentSecondary text-white font-medium rounded-lg transition-all duration-200 hover-lift"
            >
              Schedule Full Demo
            </button>
            <button
              onClick={onReset}
              className="px-6 py-3 border border-white/20 hover:bg-white/10 text-corporate-textPrimary font-medium rounded-lg transition-all duration-200"
            >
              Try Another Scenario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoResults;
