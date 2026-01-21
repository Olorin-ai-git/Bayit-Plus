/**
 * Bulk Tool Actions Component
 * Feature: 004-new-olorin-frontend
 *
 * Provides bulk actions for tool selection and management including
 * select all, select none, and select recommended. Uses Olorin purple corporate colors.
 */

import React from 'react';
import { EnhancedTool, AgentName, AgentConfig } from '@shared/types/agent.types';
import {
  CheckIcon,
  XMarkIcon,
  FireIcon
} from '@heroicons/react/24/outline';

export interface BulkToolActionsProps {
  availableTools: EnhancedTool[];
  selectedTools: string[];
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectRecommended: () => void;
  onSelectOlorinOnly?: () => void;
  agentName?: AgentName | null;
  agentConfig?: AgentConfig | null;
}

/**
 * Component providing bulk actions for tool selection and management
 */
export const BulkToolActions: React.FC<BulkToolActionsProps> = ({
  availableTools,
  selectedTools,
  onSelectAll,
  onSelectNone,
  onSelectRecommended,
  onSelectOlorinOnly,
  agentName = null,
  agentConfig = null
}) => {
  const recommendedTools = agentConfig?.recommendedTools || [];

  const totalTools = availableTools.length;
  const selectedCount = selectedTools.length;
  const recommendedSelectedCount = selectedTools.filter((toolName) =>
    recommendedTools.includes(toolName)
  ).length;

  const isAllSelected = selectedCount === totalTools && totalTools > 0;
  const isNoneSelected = selectedCount === 0;
  const isRecommendedSelected =
    recommendedSelectedCount === recommendedTools.length &&
    selectedCount === recommendedTools.length &&
    recommendedTools.length > 0;

  return (
    <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-lg p-4 shadow-lg hover:border-corporate-accentPrimary/60 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-corporate-textPrimary">
          Quick Actions
        </h4>
        <span className="text-xs text-corporate-textTertiary">
          {selectedCount} of {totalTools} selected
        </span>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Select All */}
        <button
          onClick={onSelectAll}
          disabled={isAllSelected || totalTools === 0}
          className={`
            px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corporate-accentPrimary
            ${
              isAllSelected || totalTools === 0
                ? 'bg-black/30 text-corporate-textTertiary cursor-not-allowed opacity-50 border-2 border-corporate-borderPrimary/40'
                : 'bg-corporate-accentSecondary/20 text-corporate-accentSecondary hover:bg-corporate-accentSecondary/30 border-2 border-corporate-accentSecondary/50 hover:border-corporate-accentSecondary'
            }
          `}
          aria-label="Select all available tools"
        >
          <div className="flex flex-col items-center justify-center gap-1">
            <CheckIcon className="w-4 h-4" />
            <span>Select All</span>
            <span className="text-xs opacity-75">{totalTools} tools</span>
          </div>
        </button>

        {/* Select None */}
        <button
          onClick={onSelectNone}
          disabled={isNoneSelected}
          className={`
            px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corporate-borderSecondary
            ${
              isNoneSelected
                ? 'bg-black/30 text-corporate-textTertiary cursor-not-allowed opacity-50 border-2 border-corporate-borderPrimary/40'
                : 'bg-black/30 text-corporate-textSecondary hover:bg-black/50 border-2 border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/40'
            }
          `}
          aria-label="Deselect all tools"
        >
          <div className="flex flex-col items-center justify-center gap-1">
            <XMarkIcon className="w-4 h-4" />
            <span>Select None</span>
            <span className="text-xs opacity-75">Clear all</span>
          </div>
        </button>

        {/* Select Recommended */}
        {recommendedTools.length > 0 && agentName && (
          <button
            onClick={onSelectRecommended}
            disabled={isRecommendedSelected}
            className={`
              px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corporate-success
              ${
                isRecommendedSelected
                  ? 'bg-corporate-success/20 text-corporate-success cursor-not-allowed opacity-50 border-2 border-corporate-success/50'
                  : 'bg-corporate-success/20 text-corporate-success hover:bg-corporate-success/30 border-2 border-corporate-success/50 hover:border-corporate-success'
              }
            `}
            aria-label={`Select recommended tools for ${agentName}`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <FireIcon className="w-4 h-4" />
              <span>Recommended</span>
              <span className="text-xs opacity-75">
                {recommendedTools.length} suggested
              </span>
            </div>
          </button>
        )}

        {/* Select OLORIN Only */}
        {onSelectOlorinOnly && (
          <button
            onClick={onSelectOlorinOnly}
            className="px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corporate-accentPrimary
              bg-corporate-accentPrimary/20 text-corporate-accentPrimary hover:bg-corporate-accentPrimary/30 border-2 border-corporate-accentPrimary/50 hover:border-corporate-accentPrimary"
            aria-label="Select only OLORIN enterprise tools"
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <span className="text-lg">🏢</span>
              <span>OLORIN Only</span>
              <span className="text-xs opacity-75">Enterprise</span>
            </div>
          </button>
        )}
      </div>

      {/* Status Information */}
      {totalTools > 0 && (
        <div className="mt-3 pt-3 border-t border-corporate-borderPrimary/30">
          <div className="flex items-center justify-between text-xs text-corporate-textTertiary">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-corporate-accentPrimary" />
                {availableTools.filter(t => t.toolType === 'olorin_tool').length} Enterprise
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-corporate-accentSecondary" />
                {availableTools.filter(t => t.toolType === 'mcp_tool').length} MCP
              </span>
            </div>

            {agentName && recommendedTools.length > 0 && (
              <span className="text-corporate-success">
                {recommendedTools.length} recommended
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkToolActions;
