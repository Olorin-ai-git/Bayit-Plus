/**
 * Wizard Validation Hook
 * Feature: 004-new-olorin-frontend
 *
 * Custom hook for validating Investigation Wizard settings and data.
 * Provides real-time validation with error messages.
 */

import { useCallback, useMemo } from 'react';
import { useWizardStore } from '@shared/store/wizardStore';
import { InvestigationSettingsSchema } from '@shared/types/wizard.schemas';
import { validateInvestigationSettings, validateEntityValue } from '@shared/utils/validation';
import { Entity } from '@shared/types/wizard.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface WizardValidationResult {
  validateSettings: () => ValidationResult;
  validateEntity: (entity: Entity) => ValidationResult;
  isSettingsValid: boolean;
  settingsErrors: string[];
  canStartInvestigation: boolean;
}

/**
 * Hook for wizard validation
 */
export const useWizardValidation = (): WizardValidationResult => {
  const settings = useWizardStore((state) => state.settings);

  // Validate investigation settings
  const validateSettings = useCallback((): ValidationResult => {
    if (!settings) {
      return {
        isValid: false,
        errors: ['Settings are required']
      };
    }

    // Use validation utility
    const errors = validateInvestigationSettings(settings);

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [settings]);

  // Validate individual entity
  const validateEntity = useCallback((entity: Entity): ValidationResult => {
    const validation = validateEntityValue(entity.type, entity.value);

    return {
      isValid: validation.valid,
      errors: validation.error ? [validation.error] : []
    };
  }, []);

  // Memoized settings validation result
  const settingsValidation = useMemo(() => {
    return validateSettings();
  }, [validateSettings]);

  // Check if can start investigation
  const canStartInvestigation = useMemo(() => {
    if (!settings) {
      return false;
    }

    // Settings must be valid
    if (!settingsValidation.isValid) {
      return false;
    }

    // Must have at least one entity OR autoSelectEntities flag set
    if ((!settings.entities || settings.entities.length === 0) && !settings.autoSelectEntities) {
      return false;
    }

    // All entities must be valid (only check if entities are manually selected)
    if (settings.entities && settings.entities.length > 0) {
      const allEntitiesValid = settings.entities.every((entity) => {
        const entityValidation = validateEntity(entity);
        return entityValidation.isValid;
      });

      return allEntitiesValid;
    }

    // If autoSelectEntities is set, skip entity validation (server will handle it)
    return settings.autoSelectEntities || false;
  }, [settings, settingsValidation, validateEntity]);

  return {
    validateSettings,
    validateEntity,
    isSettingsValid: settingsValidation.isValid,
    settingsErrors: settingsValidation.errors,
    canStartInvestigation
  };
};
