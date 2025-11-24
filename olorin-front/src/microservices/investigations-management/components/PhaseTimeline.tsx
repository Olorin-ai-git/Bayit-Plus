/**
 * Phase Timeline Component
 * Displays investigation phases in a timeline format
 */

import React from 'react';
import { InvestigationPhase, PhaseStatus } from '../types/investigations';

interface PhaseTimelineProps {
  phases: InvestigationPhase[];
}

const phaseStatusStyles: Record<PhaseStatus, string> = {
  'pending': 'border-corporate-borderPrimary/40 text-corporate-textSecondary',
  'in-progress': 'border-corporate-accentPrimary bg-corporate-accentPrimary/10 text-corporate-accentPrimary',
  'completed': 'border-corporate-success bg-corporate-success/10 text-corporate-success',
  'failed': 'border-corporate-error bg-corporate-error/10 text-corporate-error'
};

const phaseStatusIcons: Record<PhaseStatus, string> = {
  'pending': '○',
  'in-progress': '◐',
  'completed': '✓',
  'failed': '✗'
};

export const PhaseTimeline: React.FC<PhaseTimelineProps> = ({ phases }) => {
  if (!phases || phases.length === 0) {
    return (
      <div className="text-center py-8 text-corporate-textSecondary">
        No phases available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => {
        const statusStyle = phaseStatusStyles[phase.status] || phaseStatusStyles.pending;
        const icon = phaseStatusIcons[phase.status] || phaseStatusIcons.pending;
        const isLast = index === phases.length - 1;

        return (
          <div key={index} className="relative">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-4 top-12 w-0.5 h-full bg-corporate-borderPrimary/40" />
            )}

            {/* Phase content */}
            <div className="flex items-start gap-4">
              {/* Status icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${statusStyle}`}>
                {icon}
              </div>

              {/* Phase details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-base font-semibold text-corporate-textPrimary">
                    {phase.name}
                  </h4>
                  <span className="text-sm text-corporate-textSecondary">
                    {phase.pct}%
                  </span>
                </div>

                {/* Phase progress bar */}
                <div className="mb-2">
                  <div className="h-1.5 bg-corporate-bgSecondary rounded-full overflow-hidden border border-corporate-borderPrimary/40">
                    <div
                      className={`h-full transition-all duration-300 ${
                        phase.status === 'completed'
                          ? 'bg-gradient-to-r from-corporate-success to-corporate-success'
                          : phase.status === 'failed'
                          ? 'bg-corporate-error'
                          : 'bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary'
                      }`}
                      style={{ width: `${phase.pct}%` }}
                    />
                  </div>
                </div>

                {/* Phase metadata */}
                <div className="flex flex-wrap gap-4 text-xs text-corporate-textTertiary">
                  {phase.started && (
                    <span>Started: {new Date(phase.started).toLocaleString()}</span>
                  )}
                  {phase.ended && (
                    <span>Ended: {new Date(phase.ended).toLocaleString()}</span>
                  )}
                </div>

                {/* Phase summary */}
                {phase.summary && (
                  <p className="mt-2 text-sm text-corporate-textSecondary">
                    {phase.summary}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

