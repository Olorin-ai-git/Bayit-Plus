/**
 * Save Template Modal Component
 * Feature: 005-polling-and-persistence
 *
 * Modal for saving current entity configuration as a reusable investigation template.
 * Adapted from Olorin web plugin with Olorin corporate styling.
 */

import React, { useState } from 'react';
import { Modal } from './Modal';
import {
  EntityType,
  InvestigationTemplate,
  getEntityTypeConfig,
} from '@shared/types/entityTypes';
import { CustomTemplateManager } from '@shared/utils/CustomTemplateManager';

export interface Entity {
  id: string;
  type: EntityType;
  value: string;
  displayLabel: string;
  isPrimary: boolean;
  importanceWeight: number;
  validationStatus: 'valid' | 'invalid' | 'pending';
  validationError?: string | null;
}

export interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  correlationMode: 'AND' | 'OR';
  onTemplateSaved: () => void;
}

/**
 * Save Template Modal
 * Form for creating custom investigation templates from current settings
 */
export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen,
  onClose,
  entities,
  correlationMode,
  onTemplateSaved,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [useCase, setUseCase] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Template name is required';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Template name must be at least 3 characters';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Template name must be less than 50 characters';
    } else if (CustomTemplateManager.templateNameExists(name.trim())) {
      newErrors.name = 'A template with this name already exists';
    }

    // Description validation
    if (!description.trim()) {
      newErrors.description = 'Template description is required';
    } else if (description.trim().length < 10) {
      newErrors.description =
        'Description must be at least 10 characters';
    } else if (description.trim().length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    // Use case validation
    if (!useCase.trim()) {
      newErrors.useCase = 'Use case is required';
    } else if (useCase.trim().length < 5) {
      newErrors.useCase = 'Use case must be at least 5 characters';
    } else if (useCase.trim().length > 100) {
      newErrors.useCase = 'Use case must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle save template
   */
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      // Convert entities to template format
      // Map importanceWeight (1-10) to weight (0.0-1.5) for templates
      const templateEntities = entities.map((e) => ({
        entityType: e.type,
        weight: e.importanceWeight / 10.0, // Convert 1-10 to 0.1-1.0
        isPrimary: e.isPrimary,
      }));

      // Save template
      CustomTemplateManager.saveCustomTemplate({
        name: name.trim(),
        description: description.trim(),
        entities: templateEntities,
        correlationMode,
        useCase: useCase.trim(),
      });

      // Reset form
      setName('');
      setDescription('');
      setUseCase('');
      setErrors({});

      // Success notification
      console.info('Template saved successfully');

      // Callback and close
      onTemplateSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save template', error);
      setErrors({
        submit: 'Failed to save template. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle close with reset
   */
  const handleClose = () => {
    setName('');
    setDescription('');
    setUseCase('');
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Save as Template"
      size="lg"
      closeOnBackdrop={false}
    >
      <div className="space-y-4">
        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
            Template Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., User + Device ATO Check"
            className="w-full px-3 py-2 bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg
                     text-corporate-textPrimary placeholder-corporate-textTertiary
                     focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary focus:border-transparent
                     transition-all duration-200"
          />
          {errors.name && (
            <p className="text-sm text-corporate-error mt-1">{errors.name}</p>
          )}
        </div>

        {/* Template Description */}
        <div>
          <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this template is used for..."
            rows={3}
            className="w-full px-3 py-2 bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg
                     text-corporate-textPrimary placeholder-corporate-textTertiary resize-none
                     focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary focus:border-transparent
                     transition-all duration-200"
          />
          {errors.description && (
            <p className="text-sm text-corporate-error mt-1">{errors.description}</p>
          )}
        </div>

        {/* Use Case */}
        <div>
          <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
            Use Case *
          </label>
          <input
            type="text"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="e.g., Account Takeover Detection"
            className="w-full px-3 py-2 bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg
                     text-corporate-textPrimary placeholder-corporate-textTertiary
                     focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary focus:border-transparent
                     transition-all duration-200"
          />
          {errors.useCase && (
            <p className="text-sm text-corporate-error mt-1">{errors.useCase}</p>
          )}
        </div>

        {/* Template Preview */}
        <div className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 p-4">
          <h4 className="text-sm font-semibold text-corporate-textPrimary mb-3">
            Template Preview
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-corporate-textTertiary">Entities:</span>
              <div className="flex flex-wrap gap-2">
                {entities.map((entity) => {
                  const config = getEntityTypeConfig(entity.type);
                  return (
                    <span
                      key={entity.id}
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
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-corporate-textTertiary">
                Correlation Mode:
              </span>
              <span
                className={`text-xs px-2 py-1 rounded border ${
                  correlationMode === 'AND'
                    ? 'bg-blue-900/20 text-blue-400 border-blue-500/30'
                    : 'bg-purple-900/20 text-purple-400 border-purple-500/30'
                }`}
              >
                {correlationMode}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-corporate-error/20 border border-corporate-error text-red-300 rounded-lg p-3 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-corporate-borderPrimary">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-black/40 backdrop-blur-md hover:bg-black/30 backdrop-blur
                     text-corporate-textSecondary font-medium transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover
                     text-white font-medium transition-all duration-200 shadow-lg
                     hover:shadow-corporate-accentPrimary/50 hover:scale-105 active:scale-95
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveTemplateModal;
