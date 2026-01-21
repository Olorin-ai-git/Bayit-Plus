/**
 * Investigation Type Toggle Component
 * Feature: 006-hybrid-graph-integration
 *
 * Two-option selector for choosing between structured and hybrid graph investigation modes.
 */

import React from 'react';
import { BeakerIcon, CircleStackIcon } from '@heroicons/react/24/outline';

export type InvestigationType = 'structured' | 'hybrid-graph';

interface InvestigationTypeToggleProps {
  investigationType: InvestigationType;
  onTypeChange: (type: InvestigationType) => void;
  className?: string;
}

export function InvestigationTypeToggle({
  investigationType,
  onTypeChange,
  className = ''
}: InvestigationTypeToggleProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Structured Investigation */}
        <button
          type="button"
          onClick={() => onTypeChange('structured')}
          className={`
            relative p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${
              investigationType === 'structured'
                ? 'border-corporate-accentPrimary bg-corporate-accentPrimary/10 shadow-lg shadow-corporate-accentPrimary/20'
                : 'border-corporate-borderPrimary bg-black/40 backdrop-blur hover:border-corporate-accentPrimary/50 hover:bg-black/60'
            }
          `}
        >
          <div className="flex items-start space-x-3">
            <BeakerIcon
              className={`
                h-6 w-6 flex-shrink-0 mt-0.5
                ${investigationType === 'structured' ? 'text-corporate-accentPrimary' : 'text-corporate-textSecondary'}
              `}
            />
            <div className="flex-1 min-w-0">
              <h4
                className={`
                  text-sm font-semibold mb-1
                  ${investigationType === 'structured' ? 'text-corporate-accentPrimary' : 'text-corporate-textPrimary'}
                `}
              >
                Structured Investigation
              </h4>
              <p className="text-xs text-corporate-textSecondary leading-relaxed">
                Standard structured investigation mode with full wizard support and comprehensive agent orchestration
              </p>
            </div>
          </div>
          {investigationType === 'structured' && (
            <div className="absolute top-2 right-2">
              <div className="h-2 w-2 rounded-full bg-corporate-accentPrimary animate-pulse" />
            </div>
          )}
        </button>

        {/* Hybrid Graph Investigation */}
        <button
          type="button"
          onClick={() => onTypeChange('hybrid-graph')}
          className={`
            relative p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${
              investigationType === 'hybrid-graph'
                ? 'border-corporate-accentPrimary bg-corporate-accentPrimary/10 shadow-lg shadow-corporate-accentPrimary/20'
                : 'border-corporate-borderPrimary bg-black/40 backdrop-blur hover:border-corporate-accentPrimary/50 hover:bg-black/60'
            }
          `}
        >
          <div className="flex items-start space-x-3">
            <CircleStackIcon
              className={`
                h-6 w-6 flex-shrink-0 mt-0.5
                ${investigationType === 'hybrid-graph' ? 'text-corporate-accentPrimary' : 'text-corporate-textSecondary'}
              `}
            />
            <div className="flex-1 min-w-0">
              <h4
                className={`
                  text-sm font-semibold mb-1
                  ${investigationType === 'hybrid-graph' ? 'text-corporate-accentPrimary' : 'text-corporate-textPrimary'}
                `}
              >
                Hybrid Graph Investigation
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-corporate-accentPrimary/20 text-corporate-accentPrimary">
                  Advanced
                </span>
              </h4>
              <p className="text-xs text-corporate-textSecondary leading-relaxed">
                Advanced entity analysis with real-time progress tracking and graph-based entity relationships
              </p>
            </div>
          </div>
          {investigationType === 'hybrid-graph' && (
            <div className="absolute top-2 right-2">
              <div className="h-2 w-2 rounded-full bg-corporate-accentPrimary animate-pulse" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
