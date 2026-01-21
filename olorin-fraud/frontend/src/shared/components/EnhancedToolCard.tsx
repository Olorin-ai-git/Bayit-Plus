/**
 * Enhanced Tool Card Component
 * Feature: 004-new-olorin-frontend
 *
 * Rich tool card with Olorin enterprise premium display, capability listing,
 * and compatibility indicators. Uses Olorin purple corporate colors.
 */

import React from 'react';
import { EnhancedTool, AgentName, ToolType } from '@shared/types/agent.types';
import { CheckIcon } from '@heroicons/react/24/solid';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export interface EnhancedToolCardProps {
  tool: EnhancedTool;
  isSelected: boolean;
  onToggle: (toolName: string) => void;
  agentName?: AgentName | null;
  showCompatibility?: boolean;
  className?: string;
  animationIndex?: number;
}

/**
 * Enhanced tool card with rich information display and premium Olorin styling
 */
export const EnhancedToolCard: React.FC<EnhancedToolCardProps> = ({
  tool,
  isSelected,
  onToggle,
  agentName = null,
  showCompatibility = true,
  className = '',
  animationIndex = 0
}) => {
  const isOlorinTool = tool.toolType === ToolType.OLORIN_TOOL;
  const isCompatible =
    !agentName ||
    !tool.agentCompatibility ||
    tool.agentCompatibility.length === 0 ||
    tool.agentCompatibility.includes(agentName);

  const cardBaseClasses = `
    relative p-4 border rounded-lg transition-all duration-200 cursor-pointer
    hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

  const cardStyleClasses = isSelected
    ? 'border-corporate-accentPrimary bg-black/30 backdrop-blur ring-2 ring-corporate-accentPrimary hover:border-corporate-accentPrimaryHover hover:shadow-purple-500/30 focus:ring-corporate-accentPrimary'
    : 'border-corporate-borderPrimary bg-black/40 backdrop-blur-md hover:border-corporate-borderSecondary hover:bg-black/30 backdrop-blur focus:ring-corporate-accentPrimary';

  return (
    <div
      className={`${cardBaseClasses} ${cardStyleClasses} ${className} animate-fade-in`}
      style={{
        animationDelay: `${animationIndex * 0.08}s`,
        animationFillMode: 'forwards',
        opacity: 0
      }}
      onClick={() => onToggle(tool.name)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(tool.name);
        }
      }}
      tabIndex={0}
      role="checkbox"
      aria-checked={isSelected}
      aria-labelledby={`tool-${tool.name}-title`}
      aria-describedby={`tool-${tool.name}-description`}
    >
      {/* Tool Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Tool Icon */}
          <span className="text-xl flex-shrink-0" aria-hidden="true">
            {tool.icon || '🔧'}
          </span>

          {/* Tool Name */}
          <h3
            id={`tool-${tool.name}-title`}
            className="font-semibold text-sm truncate text-corporate-textPrimary"
          >
            {tool.displayName}
          </h3>
        </div>

        {/* Selection Indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Checkbox */}
          <div
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center
              transition-colors duration-200
              ${
                isSelected
                  ? 'border-corporate-accentPrimary bg-corporate-accentPrimary'
                  : 'border-corporate-borderSecondary bg-black/30 backdrop-blur hover:border-corporate-accentPrimary'
              }
            `}
            aria-hidden="true"
          >
            {isSelected && (
              <CheckIcon className="w-3 h-3 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Tool Description */}
      <p
        id={`tool-${tool.name}-description`}
        className="text-xs mb-3 line-clamp-2 text-corporate-textSecondary"
      >
        {tool.description}
      </p>

      {/* Tool Capabilities */}
      {tool.capabilities && tool.capabilities.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {tool.capabilities.slice(0, 3).map((capability, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-black/30 backdrop-blur text-corporate-textTertiary border-2 border-corporate-borderPrimary/40"
                title={capability.description}
              >
                {capability.icon && (
                  <span className="text-xs">{capability.icon}</span>
                )}
                {capability.name}
              </span>
            ))}
            {tool.capabilities.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-black/30 backdrop-blur text-corporate-textTertiary border-2 border-corporate-borderPrimary/40">
                +{tool.capabilities.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tool Metadata Footer */}
      <div className="flex items-center justify-between text-xs">
        {/* Compatibility Info */}
        {showCompatibility && agentName && (
          <div className="flex items-center gap-1">
            {isCompatible ? (
              <>
                <CheckCircleIcon className="w-3 h-3 text-corporate-success" />
                <span className="text-corporate-success">Compatible</span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400">Limited</span>
              </>
            )}
          </div>
        )}

        {/* Tool Metadata */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Tool Type Badge */}
          <span
            className={`
              px-1.5 py-0.5 rounded text-xs font-medium
              ${
                isOlorinTool
                  ? 'bg-corporate-accentPrimary/20 text-corporate-accentPrimary border border-corporate-accentPrimary'
                  : 'bg-black/30 backdrop-blur text-corporate-textTertiary border-2 border-corporate-borderPrimary/40'
              }
            `}
          >
            {isOlorinTool ? 'OLORIN' : tool.toolType === ToolType.MCP_TOOL ? 'MCP' : 'External'}
          </span>
        </div>
      </div>

      {/* Enhanced hover effect for Olorin enterprise tools */}
      {isOlorinTool && (
        <div
          className="absolute inset-0 rounded-lg bg-corporate-accentPrimary/5 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-200"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default EnhancedToolCard;
