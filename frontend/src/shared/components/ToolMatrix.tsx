/**
 * Tool Matrix Component
 * Feature: 004-new-olorin-frontend
 *
 * Grid for selecting investigation tools with categories.
 * Uses Olorin purple corporate colors with tooltips.
 */

import React, { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

export interface InvestigationTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  enabled: boolean;
}

export enum ToolCategory {
  DEVICE_ANALYSIS = 'Device Analysis',
  LOCATION_ANALYSIS = 'Location Analysis',
  NETWORK_ANALYSIS = 'Network Analysis',
  BEHAVIOR_ANALYSIS = 'Behavior Analysis',
  LOGS_ANALYSIS = 'Logs Analysis',
  RISK_ASSESSMENT = 'Risk Assessment'
}

export interface ToolMatrixProps {
  tools: InvestigationTool[];
  onToolToggle: (toolId: string) => void;
  onCategoryToggle?: (category: ToolCategory, enabled: boolean) => void;
  maxTools?: number;
  className?: string;
}

/**
 * Tool selection matrix with categories
 */
export const ToolMatrix: React.FC<ToolMatrixProps> = ({
  tools,
  onToolToggle,
  onCategoryToggle,
  maxTools = 20,
  className = ''
}) => {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  const enabledCount = tools.filter(t => t.enabled).length;
  const canEnableMore = enabledCount < maxTools;

  // Group tools by category
  const toolsByCategory = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<ToolCategory, InvestigationTool[]>);

  const handleToolClick = (tool: InvestigationTool) => {
    if (!tool.enabled && !canEnableMore) {
      return;
    }
    onToolToggle(tool.id);
  };

  const handleCategoryToggle = (category: ToolCategory) => {
    const categoryTools = toolsByCategory[category];
    const allEnabled = categoryTools.every(t => t.enabled);

    if (onCategoryToggle) {
      onCategoryToggle(category, !allEnabled);
    }
  };

  const getCategoryStatus = (category: ToolCategory) => {
    const categoryTools = toolsByCategory[category];
    const enabledInCategory = categoryTools.filter(t => t.enabled).length;
    const totalInCategory = categoryTools.length;

    if (enabledInCategory === 0) return 'none';
    if (enabledInCategory === totalInCategory) return 'all';
    return 'some';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tool Count */}
      <div className="flex items-center justify-between pb-2 border-b border-corporate-borderPrimary">
        <span className="text-sm font-medium text-corporate-textPrimary">
          Investigation Tools
        </span>
        <span className="text-sm text-corporate-textTertiary">
          {enabledCount} / {maxTools} selected
        </span>
      </div>

      {/* Tool Categories */}
      {Object.entries(toolsByCategory).map(([category, categoryTools]) => {
        const status = getCategoryStatus(category as ToolCategory);

        return (
          <div key={category} className="space-y-3">
            {/* Category Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-corporate-textPrimary">
                {category}
              </h4>
              <button
                type="button"
                onClick={() => handleCategoryToggle(category as ToolCategory)}
                className="text-xs text-corporate-accentPrimary hover:text-corporate-accentPrimaryHover transition-colors"
              >
                {status === 'all' ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Tool Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {categoryTools.map((tool) => {
                const isDisabled = !tool.enabled && !canEnableMore;

                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToolClick(tool)}
                    onMouseEnter={() => setHoveredTool(tool.id)}
                    onMouseLeave={() => setHoveredTool(null)}
                    disabled={isDisabled}
                    className={`relative px-3 py-2 rounded-lg border transition-all text-left ${
                      tool.enabled
                        ? 'bg-corporate-accentPrimary/20 border-corporate-accentPrimary text-corporate-textPrimary'
                        : isDisabled
                        ? 'bg-black/30 backdrop-blur border-corporate-borderPrimary text-corporate-textTertiary opacity-50 cursor-not-allowed'
                        : 'bg-black/30 backdrop-blur border-corporate-borderPrimary text-corporate-textSecondary hover:border-corporate-accentPrimary hover:text-corporate-textPrimary'
                    }`}
                  >
                    {/* Checkmark */}
                    {tool.enabled && (
                      <div className="absolute top-2 right-2">
                        <CheckIcon className="w-4 h-4 text-corporate-accentPrimary" />
                      </div>
                    )}

                    {/* Tool Name */}
                    <div className="pr-6">
                      <span className="text-sm font-medium block truncate">
                        {tool.name}
                      </span>
                    </div>

                    {/* Tooltip */}
                    {hoveredTool === tool.id && (
                      <div className="absolute z-10 bottom-full left-0 mb-2 px-3 py-2 bg-black border-2 border-corporate-borderPrimary/40 rounded-lg shadow-lg max-w-xs">
                        <p className="text-xs text-corporate-textSecondary">
                          {tool.description}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Max Tools Warning */}
      {!canEnableMore && (
        <p className="text-sm text-amber-400">
          Maximum {maxTools} tools can be selected
        </p>
      )}
    </div>
  );
};

export default ToolMatrix;
