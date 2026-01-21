/**
 * Hybrid Graph Phase Indicator
 * Feature: 006-hybrid-graph-integration
 *
 * Displays investigation phases with current phase highlighted.
 * Shows 5 phases: Initialization, Domain Analysis, Risk Assessment, Evidence Gathering, Summary.
 */

import React from 'react';

interface Phase {
  id: string;
  name: string;
  description: string;
}

interface HybridGraphPhaseIndicatorProps {
  currentPhase: string;
  className?: string;
}

const INVESTIGATION_PHASES: Phase[] = [
  {
    id: 'initialization',
    name: 'Initialization',
    description: 'Setting up investigation context',
  },
  {
    id: 'domain_analysis',
    name: 'Domain Analysis',
    description: 'Analyzing device, location, and network data',
  },
  {
    id: 'risk_assessment',
    name: 'Risk Assessment',
    description: 'Calculating risk scores and patterns',
  },
  {
    id: 'evidence_gathering',
    name: 'Evidence Gathering',
    description: 'Collecting and correlating evidence',
  },
  {
    id: 'summary',
    name: 'Summary',
    description: 'Generating final investigation report',
  },
];

export function HybridGraphPhaseIndicator({
  currentPhase,
  className = '',
}: HybridGraphPhaseIndicatorProps) {
  const currentIndex = INVESTIGATION_PHASES.findIndex((phase) => phase.id === currentPhase);

  const getPhaseStatus = (index: number): 'completed' | 'current' | 'upcoming' => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };

  const getPhaseStyles = (status: 'completed' | 'current' | 'upcoming') => {
    switch (status) {
      case 'completed':
        return {
          container: 'bg-corporate-success/20 border-corporate-success',
          icon: 'bg-green-500 text-white',
          text: 'text-corporate-success',
          description: 'text-green-600',
        };
      case 'current':
        return {
          container: 'bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/50',
          icon: 'bg-blue-500 text-white animate-pulse',
          text: 'text-blue-300',
          description: 'text-blue-400',
        };
      case 'upcoming':
        return {
          container: 'bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40/30',
          icon: 'bg-black/50 text-corporate-textTertiary',
          text: 'text-corporate-textTertiary',
          description: 'text-corporate-textTertiary/70',
        };
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
        Investigation Phases
      </h3>

      <div className="space-y-3">
        {INVESTIGATION_PHASES.map((phase, index) => {
          const status = getPhaseStatus(index);
          const styles = getPhaseStyles(status);

          return (
            <div
              key={phase.id}
              className={`p-4 rounded-lg border transition-all ${styles.container}`}
            >
              <div className="flex items-start space-x-4">
                {/* Phase Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${styles.icon}`}>
                  {status === 'completed' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Phase Info */}
                <div className="flex-1">
                  <h4 className={`font-medium ${styles.text}`}>{phase.name}</h4>
                  <p className={`text-sm ${styles.description}`}>{phase.description}</p>
                </div>

                {/* Status Badge */}
                {status === 'current' && (
                  <span className="px-3 py-1 text-xs font-medium bg-blue-500/20 text-blue-300 rounded-full">
                    In Progress
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
