/**
 * Tool Matrix Selector Component
 * Feature: 006-hybrid-graph-integration
 *
 * Matrix component for selecting investigation tools organized by category.
 * Supports 6 tool categories with individual tool selection.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { toolCategories, type ToolCategory } from '../../constants/toolCategories';

interface ToolConfig {
  tool_id: string;
  parameters?: Record<string, any>;
}

interface ToolMatrixSelectorProps {
  onSelectionChange: (selectedTools: ToolConfig[]) => void;
  disabled?: boolean;
}

export function ToolMatrixSelector({ onSelectionChange, disabled = false }: ToolMatrixSelectorProps) {
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(toolCategories.map((cat) => cat.category))
  );

  const handleToolToggle = useCallback((toolId: string) => {
    setSelectedToolIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  }, []);

  const handleCategoryToggle = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllInCategory = useCallback((category: ToolCategory) => {
    const categoryToolIds = category.tools.map((tool) => tool.id);
    const allSelected = categoryToolIds.every((id) => selectedToolIds.has(id));

    setSelectedToolIds((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        categoryToolIds.forEach((id) => newSet.delete(id));
      } else {
        categoryToolIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, [selectedToolIds]);

  useEffect(() => {
    const selectedTools: ToolConfig[] = Array.from(selectedToolIds).map((toolId) => ({
      tool_id: toolId,
      parameters: {},
    }));
    onSelectionChange(selectedTools);
  }, [selectedToolIds, onSelectionChange]);

  const getCategoryStats = (category: ToolCategory): string => {
    const total = category.tools.length;
    const selected = category.tools.filter((tool) => selectedToolIds.has(tool.id)).length;
    return `${selected}/${total}`;
  };

  const isCategoryFullySelected = (category: ToolCategory): boolean => {
    return category.tools.every((tool) => selectedToolIds.has(tool.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-corporate-textPrimary">
          Investigation Tools
        </h3>
        <span className="text-sm text-corporate-textSecondary">
          {selectedToolIds.size} tool{selectedToolIds.size !== 1 ? 's' : ''} selected
        </span>
      </div>

      {toolCategories.map((category) => {
        const isExpanded = expandedCategories.has(category.category);
        const isFullySelected = isCategoryFullySelected(category);

        return (
          <div
            key={category.category}
            className="border-2 border-corporate-borderPrimary/40 rounded-lg overflow-hidden"
          >
            <div className="bg-black/40 backdrop-blur px-4 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCategoryToggle(category.category)}
                disabled={disabled}
                className="flex items-center space-x-3 flex-1 text-left disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/50 transition-colors"
              >
                <svg
                  className={`w-5 h-5 text-corporate-textSecondary transform transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium text-corporate-textPrimary">{category.title}</span>
                <span className="text-sm text-corporate-textSecondary">({getCategoryStats(category)})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectAllInCategory(category)}
                disabled={disabled}
                className="px-3 py-1 text-sm font-medium text-corporate-accentPrimary hover:text-corporate-accentPrimary hover:bg-black/50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isFullySelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {isExpanded && (
              <div className="px-4 py-3 space-y-3 bg-black/30 backdrop-blur border-t border-corporate-borderPrimary">
                {category.tools.map((tool) => {
                  const isSelected = selectedToolIds.has(tool.id);

                  return (
                    <label
                      key={tool.id}
                      className={`flex items-start space-x-3 p-3 rounded-md cursor-pointer transition-colors ${
                        isSelected ? 'bg-black/40 backdrop-blur border border-corporate-accentPrimary' : 'hover:bg-black/40'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToolToggle(tool.id)}
                        disabled={disabled}
                        className="mt-1 h-4 w-4 accent-corporate-accentPrimary border-corporate-borderPrimary rounded focus:ring-2 focus:ring-corporate-accentPrimary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-corporate-textPrimary">{tool.name}</div>
                        <div className="text-sm text-corporate-textSecondary">{tool.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
