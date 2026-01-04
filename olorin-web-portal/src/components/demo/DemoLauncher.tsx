/**
 * Demo Launcher Component
 *
 * Main entry point for the interactive demo, handles scenario
 * selection and demo initiation.
 */

import React from 'react';
import { DemoScenario, RateLimitInfo } from '../../services/demoApiService';
import { DemoScenarioCard } from './DemoScenarioCard';

interface DemoLauncherProps {
  scenarios: DemoScenario[];
  selectedScenario: DemoScenario | null;
  rateLimit: RateLimitInfo | null;
  isLoading: boolean;
  error: Error | null;
  onSelectScenario: (scenario: DemoScenario) => void;
  onStart: () => void;
}

export const DemoLauncher: React.FC<DemoLauncherProps> = ({
  scenarios,
  selectedScenario,
  rateLimit,
  isLoading,
  error,
  onSelectScenario,
  onStart,
}) => {
  const canStart = selectedScenario && !isLoading && (!rateLimit || rateLimit.remaining > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-corporate-accentPrimary bg-corporate-accentPrimary/10 rounded-full border border-corporate-accentPrimary/20">
          Live AI Demo
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
          See Our AI Agents in Action
        </h2>
        <p className="text-corporate-textSecondary max-w-2xl mx-auto">
          Select a fraud scenario below and watch our AI agents investigate in real-time.
          Each investigation showcases different detection capabilities.
        </p>
      </div>

      {/* Rate Limit Warning */}
      {rateLimit && rateLimit.remaining === 0 && (
        <div className="glass-card p-4 border-corporate-warning/30 bg-corporate-warning/10">
          <p className="text-corporate-warning text-center">
            Demo limit reached. Please try again later or{' '}
            <a href="/contact" className="underline hover:brightness-125">
              contact us
            </a>{' '}
            for a full demo.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="glass-card p-4 border-corporate-error/30 bg-corporate-error/10">
          <p className="text-corporate-error text-center">{error.message}</p>
        </div>
      )}

      {/* Scenario Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((scenario) => (
          <DemoScenarioCard
            key={scenario.id}
            scenario={scenario}
            isSelected={selectedScenario?.id === scenario.id}
            onSelect={onSelectScenario}
          />
        ))}
      </div>

      {/* Start Button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`
            px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300
            ${
              canStart
                ? 'bg-[#9333EA] hover:bg-[#A855F7] text-white shadow-lg shadow-[#9333EA]/40 hover:shadow-[#9333EA]/60 hover-lift'
                : 'bg-[#4C1D95]/50 text-[#C4B5FD] cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Starting Investigation...
            </span>
          ) : (
            'Start Investigation'
          )}
        </button>

        {rateLimit && rateLimit.remaining > 0 && (
          <p className="text-corporate-textMuted text-sm">
            {rateLimit.remaining} demo{rateLimit.remaining !== 1 ? 's' : ''} remaining
          </p>
        )}
      </div>

      {/* What You'll See */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
          What You&apos;ll Experience
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-corporate-accentPrimary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <p className="text-corporate-textPrimary font-medium">AI Agent Coordination</p>
              <p className="text-corporate-textSecondary text-sm">
                Watch multiple AI agents work together in parallel
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-corporate-accentPrimary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <p className="text-corporate-textPrimary font-medium">Real-Time Analysis</p>
              <p className="text-corporate-textSecondary text-sm">
                See risk scores update as investigation progresses
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-corporate-accentPrimary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <p className="text-corporate-textPrimary font-medium">Detailed Findings</p>
              <p className="text-corporate-textSecondary text-sm">
                View comprehensive results from each agent
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoLauncher;
