/**
 * Agent Selection Panel Component
 * Feature: 004-new-olorin-frontend
 *
 * Grid panel for selecting investigation agents with icons, descriptions,
 * and tooltips. Uses Olorin purple corporate colors.
 */

import React, { useState } from 'react';
import { AgentConfig, AgentName, getAgentIcon, getAgentDisplayName } from '@shared/types/agent.types';
import { CheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export interface AgentSelectionPanelProps {
  agents: AgentConfig[];
  selectedAgent: AgentName | null;
  onAgentSelect: (agentName: AgentName) => void;
  className?: string;
}

/**
 * Panel for selecting investigation agents with rich display
 */
export const AgentSelectionPanel: React.FC<AgentSelectionPanelProps> = ({
  agents,
  selectedAgent,
  onAgentSelect,
  className = ''
}) => {
  const [hoveredAgent, setHoveredAgent] = useState<AgentName | null>(null);

  console.log('[AgentSelectionPanel] Rendering with agents:', agents);
  console.log('[AgentSelectionPanel] Agents count:', agents.length);
  console.log('[AgentSelectionPanel] Selected agent:', selectedAgent);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Debug Info */}
      {agents.length === 0 && (
        <div className="text-sm text-corporate-error p-3 bg-corporate-error/20 border border-corporate-error/50 rounded">
          No agents available. Agents array is empty.
        </div>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((agent, index) => {
          const isSelected = selectedAgent === agent.name;
          const isHovered = hoveredAgent === agent.name;
          const displayName = getAgentDisplayName(agent.name);
          const icon = getAgentIcon(agent.name);

          return (
            <div
              key={agent.name}
              className={`
                relative p-4 border rounded-lg transition-all duration-200 cursor-pointer
                hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2
                animate-fade-in
                ${
                  isSelected
                    ? 'border-corporate-accentPrimary bg-black/30 backdrop-blur ring-2 ring-corporate-accentPrimary hover:border-corporate-accentPrimaryHover hover:shadow-purple-500/30 focus:ring-corporate-accentPrimary'
                    : 'border-corporate-borderPrimary bg-black/40 backdrop-blur-md hover:border-corporate-borderSecondary hover:bg-black/30 backdrop-blur focus:ring-corporate-accentPrimary'
                }
              `}
              style={{
                animationDelay: `${index * 0.08}s`,
                animationFillMode: 'forwards',
                opacity: 0
              }}
              onClick={() => onAgentSelect(agent.name)}
              onMouseEnter={() => setHoveredAgent(agent.name)}
              onMouseLeave={() => setHoveredAgent(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onAgentSelect(agent.name);
                }
              }}
              tabIndex={0}
              role="radio"
              aria-checked={isSelected}
              aria-labelledby={`agent-${agent.name}-title`}
              aria-describedby={`agent-${agent.name}-description`}
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Agent Icon */}
                  <span className="text-2xl flex-shrink-0" aria-hidden="true">
                    {icon}
                  </span>

                  {/* Agent Name */}
                  <h4
                    id={`agent-${agent.name}-title`}
                    className="font-semibold text-sm text-corporate-textPrimary"
                  >
                    {displayName}
                  </h4>
                </div>

                {/* Selection Indicator */}
                <div
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    transition-colors duration-200 flex-shrink-0
                    ${
                      isSelected
                        ? 'border-corporate-accentPrimary bg-corporate-accentPrimary'
                        : 'border-corporate-borderSecondary bg-black/30 backdrop-blur'
                    }
                  `}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <CheckIcon className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>

              {/* Agent Description */}
              <p
                id={`agent-${agent.name}-description`}
                className="text-xs text-corporate-textSecondary line-clamp-2 mb-2"
              >
                {agent.description}
              </p>

              {/* Agent Metadata */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-corporate-textTertiary">
                  {agent.compatibleTools.length} compatible tools
                </span>

                {/* Info Icon with Tooltip */}
                <div className="relative">
                  <InformationCircleIcon
                    className="w-4 h-4 text-corporate-textTertiary hover:text-corporate-accentPrimary transition-colors"
                    aria-label={`More info about ${displayName}`}
                  />

                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute z-10 bottom-full right-0 mb-2 px-3 py-2 bg-black border-2 border-corporate-borderPrimary/40 rounded-lg shadow-lg w-64">
                      <p className="text-xs text-corporate-textSecondary mb-2">
                        {agent.description}
                      </p>
                      <div className="text-xs text-corporate-textTertiary">
                        <p>Compatible: {agent.compatibleTools.length} tools</p>
                        <p>Recommended: {agent.recommendedTools.length} tools</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Agent Enabled Badge */}
              {agent.enabled && (
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-corporate-success/30 text-corporate-success border border-corporate-success/50">
                    Active
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="flex items-start gap-2 p-3 bg-black/30 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg">
        <InformationCircleIcon className="w-5 h-5 text-corporate-accentSecondary flex-shrink-0 mt-0.5" />
        <div className="text-xs text-corporate-textSecondary">
          <p className="font-medium text-corporate-textPrimary mb-1">
            Agents Selection
          </p>
          <p>
            Select agents to configure their investigation tools. Each agent specializes
            in different aspects of fraud detection and has compatible tools optimized
            for its analysis domain.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentSelectionPanel;
