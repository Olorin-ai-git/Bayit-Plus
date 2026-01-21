/**
 * Agent Tools Summary Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays agent tools summary with selection counts, progress bars,
 * and configuration status. Uses Olorin purple corporate colors.
 */

import React from 'react';
import { AgentName, getAgentDisplayName, getAgentIcon } from '@shared/types/agent.types';

export interface AgentToolsSummaryProps {
  agentName: AgentName;
  totalTools: number;
  selectedTools: number;
  olorinTools: number;
  externalTools?: number;
  mcpTools?: number;
  onViewDetails: () => void;
  animationIndex?: number;
}

/**
 * Component to display agent tools summary with counts and selection status
 */
export const AgentToolsSummary: React.FC<AgentToolsSummaryProps> = ({
  agentName,
  totalTools,
  selectedTools,
  olorinTools,
  externalTools = 0,
  mcpTools = 0,
  onViewDetails,
  animationIndex = 0
}) => {
  const selectionPercentage =
    totalTools > 0 ? Math.round((selectedTools / totalTools) * 100) : 0;
  const isFullyConfigured = selectedTools > 0;
  const hasOlorinTools = olorinTools > 0;

  const displayName = getAgentDisplayName(agentName);

  return (
    <div
      className={`
        relative p-4 border rounded-lg transition-all duration-200 cursor-pointer
        hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2
        animate-fade-in
        ${
          isFullyConfigured
            ? 'border-corporate-accentPrimary bg-black/30 backdrop-blur ring-2 ring-corporate-accentPrimary hover:border-corporate-accentPrimaryHover hover:shadow-purple-500/30 focus:ring-corporate-accentPrimary'
            : 'border-corporate-borderPrimary bg-black/40 backdrop-blur-md hover:border-corporate-borderSecondary hover:bg-black/30 backdrop-blur focus:ring-corporate-accentPrimary'
        }
      `}
      style={{
        animationDelay: `${animationIndex * 0.1}s`,
        animationFillMode: 'forwards',
        opacity: 0
      }}
      onClick={onViewDetails}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onViewDetails) {
          e.preventDefault();
          onViewDetails();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${displayName}`}
    >
      {/* Agent Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            {getAgentIcon(agentName)}
          </span>
          <h4 className="font-semibold text-sm text-corporate-textPrimary">
            {displayName}
          </h4>
        </div>

        {/* Configuration Status Badge */}
        <div className="flex items-center gap-2">
          {hasOlorinTools && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-corporate-accentPrimary text-white">
              OLORIN
            </span>
          )}

          <span
            className={`
            px-1.5 py-0.5 rounded text-xs font-medium
            ${
              isFullyConfigured
                ? 'bg-corporate-success/30 text-corporate-success border border-corporate-success/50'
                : 'bg-black/30 backdrop-blur text-corporate-textTertiary border-2 border-corporate-borderPrimary/40'
            }
          `}
          >
            {isFullyConfigured ? 'Configured' : 'Not Set'}
          </span>
        </div>
      </div>

      {/* Tools Summary */}
      <div className="space-y-2">
        {/* Selection Overview */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-corporate-textSecondary">
            {selectedTools} of {totalTools} tools selected
          </span>

          {selectionPercentage > 0 && (
            <span className="text-xs font-medium text-corporate-textTertiary">
              {selectionPercentage}%
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/30 backdrop-blur rounded-full h-2 border-2 border-corporate-borderPrimary/40">
          <div
            className="h-2 bg-corporate-accentPrimary rounded-full transition-all duration-300"
            style={{ width: `${selectionPercentage}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={selectionPercentage}
            aria-label={`${selectionPercentage}% of tools selected`}
          />
        </div>

        {/* Tool Categories Breakdown */}
        {totalTools > 0 && (
          <div className="flex items-center gap-3 text-xs">
            {olorinTools > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-corporate-accentPrimary" />
                <span className="text-corporate-textTertiary font-medium">
                  {olorinTools} OLORIN
                </span>
              </div>
            )}

            {externalTools > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-corporate-textTertiary" />
                <span className="text-corporate-textTertiary font-medium">
                  {externalTools} External
                </span>
              </div>
            )}

            {mcpTools > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-corporate-accentSecondary" />
                <span className="text-corporate-textTertiary font-medium">
                  {mcpTools} MCP
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails();
        }}
        className="mt-3 w-full px-3 py-2 rounded-lg text-xs font-medium bg-corporate-accentPrimary text-white hover:bg-corporate-accentPrimaryHover transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corporate-accentPrimary"
      >
        {isFullyConfigured ? 'Manage Tools' : 'Configure Tools'}
      </button>
    </div>
  );
};

export default AgentToolsSummary;
