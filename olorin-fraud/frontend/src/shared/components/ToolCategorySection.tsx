/**
 * Tool Category Section Component
 * Feature: 004-new-olorin-frontend
 *
 * Collapsible category section for organizing tools with Olorin enterprise
 * enterprise badges and selection counts. Uses Olorin purple corporate colors.
 */

import React from 'react';
import { EnhancedTool, AgentName, ToolType } from '@shared/types/agent.types';
import { EnhancedToolCard } from './EnhancedToolCard';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface ToolCategorySectionProps {
  categoryName: string;
  categoryTitle: string;
  tools: EnhancedTool[];
  selectedTools: string[];
  onToolToggle: (toolName: string) => void;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  agentName?: AgentName | null;
}

/**
 * Enhanced category section component for organizing tools with collapsible display
 */
export const ToolCategorySection: React.FC<ToolCategorySectionProps> = ({
  categoryName,
  categoryTitle,
  tools,
  selectedTools,
  onToolToggle,
  isExpanded,
  onToggleExpansion,
  agentName = null
}) => {
  const isOlorinCategory = categoryName === 'olorin_tools';
  const selectedCount = tools.filter((tool) =>
    selectedTools.includes(tool.name)
  ).length;

  const headerClasses = isOlorinCategory
    ? 'bg-corporate-accentPrimary/10 hover:bg-corporate-accentPrimary/20 border border-corporate-accentPrimary'
    : 'bg-black/40 backdrop-blur-md hover:bg-black/30 backdrop-blur border-2 border-corporate-borderPrimary/40';

  const iconClasses = isOlorinCategory
    ? 'text-corporate-accentPrimary'
    : 'text-corporate-textTertiary';

  return (
    <div className="border-2 border-corporate-borderPrimary/40 rounded-lg overflow-hidden">
      {/* Category Header */}
      <button
        onClick={onToggleExpansion}
        className={`
          w-full px-4 py-3 flex items-center justify-between
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          ${headerClasses}
          ${isOlorinCategory ? 'focus:ring-corporate-accentPrimary' : 'focus:ring-corporate-accentSecondary'}
        `}
        aria-expanded={isExpanded}
        aria-controls={`category-${categoryName}-content`}
      >
        <div className="flex items-center gap-3">
          {/* Category Icon */}
          <span className={`text-xl ${iconClasses}`} aria-hidden="true">
            {isOlorinCategory ? '🏢' : '🔧'}
          </span>

          {/* Category Title */}
          <div className="flex items-center gap-2">
            <h3
              className={`font-semibold text-base ${
                isOlorinCategory
                  ? 'text-corporate-accentPrimary'
                  : 'text-corporate-textPrimary'
              }`}
            >
              {categoryTitle}
            </h3>

            {/* Enterprise Badge */}
            {isOlorinCategory && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-corporate-accentPrimary text-white border border-corporate-accentPrimary">
                ENTERPRISE
              </span>
            )}
          </div>

          {/* Tool Count and Selection Status */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`font-medium ${
                isOlorinCategory
                  ? 'text-corporate-accentPrimary'
                  : 'text-corporate-textSecondary'
              }`}
            >
              {tools.length} tool{tools.length !== 1 ? 's' : ''}
            </span>

            {selectedCount > 0 && (
              <span
                className={`
                px-2 py-0.5 rounded-md text-xs font-medium
                ${
                  isOlorinCategory
                    ? 'bg-corporate-accentPrimary text-white'
                    : 'bg-corporate-accentSecondary text-white'
                }
              `}
              >
                {selectedCount} selected
              </span>
            )}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <ChevronDownIcon
          className={`
            w-5 h-5 transition-transform duration-200
            ${isExpanded ? 'transform rotate-180' : ''}
            ${iconClasses}
          `}
          aria-hidden="true"
        />
      </button>

      {/* Category Content */}
      {isExpanded && (
        <div
          id={`category-${categoryName}-content`}
          className={`
            p-4 border-t transition-colors duration-200
            ${
              isOlorinCategory
                ? 'border-corporate-accentPrimary bg-black'
                : 'border-corporate-borderPrimary bg-black'
            }
          `}
        >
          {tools.length === 0 ? (
            /* Empty State */
            <div className="text-center py-8">
              <div className={`text-4xl mb-2 ${iconClasses}`}>
                {isOlorinCategory ? '🏢' : '🔧'}
              </div>
              <p
                className={`text-sm font-medium ${
                  isOlorinCategory
                    ? 'text-corporate-accentPrimary'
                    : 'text-corporate-textSecondary'
                }`}
              >
                No {categoryTitle.toLowerCase()} available
              </p>
              <p
                className={`text-xs mt-1 ${
                  isOlorinCategory
                    ? 'text-corporate-textTertiary'
                    : 'text-corporate-textTertiary'
                }`}
              >
                Tools will appear here when discovered
              </p>
            </div>
          ) : (
            /* Tools Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool, index) => (
                <EnhancedToolCard
                  key={tool.name}
                  tool={tool}
                  isSelected={selectedTools.includes(tool.name)}
                  onToggle={onToolToggle}
                  agentName={agentName}
                  showCompatibility={true}
                  animationIndex={index}
                />
              ))}
            </div>
          )}

          {/* Category Footer Info */}
          {tools.length > 0 && (
            <div
              className={`
              mt-4 pt-3 border-t text-xs
              ${
                isOlorinCategory
                  ? 'border-corporate-accentPrimary/30 text-corporate-textTertiary'
                  : 'border-corporate-borderPrimary text-corporate-textTertiary'
              }
            `}
            >
              <div className="flex items-center justify-between">
                <span>
                  {isOlorinCategory
                    ? 'Enterprise tools with enhanced capabilities'
                    : 'Standard MCP tools for investigation workflows'}
                </span>

                {agentName && <span>Compatible with {agentName}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolCategorySection;
