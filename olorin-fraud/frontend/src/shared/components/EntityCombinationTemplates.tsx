/**
 * Entity Combination Templates Component
 * Feature: 005-polling-and-persistence
 *
 * Displays built-in and custom investigation templates for multi-entity investigations.
 * Adapted from Olorin web plugin with Olorin corporate styling.
 */

import React from 'react';
import { TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import {
  COMMON_ENTITY_COMBINATIONS,
  InvestigationTemplate,
  getEntityTypeConfig,
} from '@shared/types/entityTypes';

export interface EntityCombinationTemplatesProps {
  onSelectTemplate: (templateIdOrKey: string) => void;
  customTemplates?: InvestigationTemplate[];
  onDeleteTemplate?: (templateId: string) => void;
  className?: string;
}

/**
 * Entity Combination Templates Component
 * Shows grid of built-in and custom investigation templates
 */
export const EntityCombinationTemplates: React.FC<
  EntityCombinationTemplatesProps
> = ({
  onSelectTemplate,
  customTemplates = [],
  onDeleteTemplate,
  className = '',
}) => {
  const builtInTemplates = Object.entries(COMMON_ENTITY_COMBINATIONS);

  /**
   * Render a single template card
   */
  const renderTemplateCard = (
    template: InvestigationTemplate,
    templateKey: string,
    isCustom: boolean,
  ) => {
    const { name, description, entities, correlationMode, useCase } = template;

    return (
      <div
        key={isCustom ? template.id : templateKey}
        className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40
                   hover:border-corporate-accentPrimary hover:shadow-lg transition-all duration-200
                   cursor-pointer group"
        onClick={() =>
          onSelectTemplate(isCustom ? template.id! : templateKey)
        }
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <UserGroupIcon className="w-5 h-5 text-corporate-accentPrimary" />
                <h4 className="text-base font-semibold text-corporate-textPrimary">
                  {name}
                </h4>
                {isCustom && (
                  <span className="text-xs px-2 py-0.5 bg-corporate-accentPrimary/20 text-corporate-accentPrimary rounded border border-corporate-accentPrimary/30">
                    Custom
                  </span>
                )}
              </div>
              <p className="text-sm text-corporate-textTertiary">
                {description}
              </p>
            </div>

            {/* Delete button for custom templates */}
            {isCustom && onDeleteTemplate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTemplate(template.id!);
                }}
                className="ml-2 p-1.5 rounded hover:bg-corporate-error/20 text-corporate-textTertiary hover:text-corporate-error transition-colors opacity-0 group-hover:opacity-100"
                title="Delete template"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Entity badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {entities.map((entity, idx) => {
              const config = getEntityTypeConfig(entity.entityType);
              return (
                <span
                  key={idx}
                  className={`text-xs px-2 py-1 rounded border ${
                    entity.isPrimary
                      ? 'bg-corporate-accentPrimary/20 border-corporate-accentPrimary text-corporate-accentPrimary font-medium'
                      : 'bg-black/40 backdrop-blur-md border-corporate-borderSecondary text-corporate-textSecondary'
                  }`}
                >
                  {config.label}
                  {entity.isPrimary && ' ⭐'}
                </span>
              );
            })}
          </div>

          {/* Footer metadata */}
          <div className="flex items-center justify-between text-xs text-corporate-textTertiary pt-2 border-t border-corporate-borderSecondary">
            <span className="flex items-center gap-1">
              <span className="font-medium">Mode:</span>
              <span
                className={`px-2 py-0.5 rounded ${
                  correlationMode === 'AND'
                    ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                    : 'bg-purple-900/20 text-purple-400 border border-purple-500/30'
                }`}
              >
                {correlationMode}
              </span>
            </span>
            <span className="text-corporate-textTertiary">{useCase}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Built-in Templates Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-corporate-textPrimary mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-corporate-accentPrimary rounded"></span>
          Built-in Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builtInTemplates.map(([key, template]) =>
            renderTemplateCard(template, key, false),
          )}
        </div>
      </div>

      {/* Custom Templates Section */}
      {customTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-corporate-textPrimary mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-corporate-accentSecondary rounded"></span>
            Custom Templates ({customTemplates.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customTemplates.map((template) =>
              renderTemplateCard(template, template.id!, true),
            )}
          </div>
        </div>
      )}

      {/* Empty state for custom templates */}
      {customTemplates.length === 0 && (
        <div className="text-center py-6 bg-black/30 backdrop-blur/50 rounded-lg border border-dashed border-corporate-borderSecondary">
          <p className="text-sm text-corporate-textTertiary">
            No custom templates yet. Create your own from current settings.
          </p>
        </div>
      )}
    </div>
  );
};

export default EntityCombinationTemplates;
