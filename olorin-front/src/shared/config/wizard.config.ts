/**
 * Investigation Wizard Configuration
 * Feature: 004-new-olorin-frontend
 *
 * Configuration loader for wizard data model settings.
 * All values from environment variables with validation.
 */

import { z } from 'zod';
import { CorrelationMode, ExecutionMode } from '../types/wizard.types';

/**
 * Data model configuration schema
 */
export const DataModelConfigSchema = z.object({
  maxEntitiesPerInvestigation: z.number().int().positive(),
  maxToolSelectionsPerInvestigation: z.number().int().positive(),
  defaultRiskThreshold: z.number().min(0).max(100),
  defaultCorrelationMode: z.nativeEnum(CorrelationMode),
  defaultExecutionMode: z.nativeEnum(ExecutionMode),
  autoSaveIntervalMs: z.number().int().positive(),
  validationDebounceMs: z.number().int().positive(),
  progressUpdateIntervalMs: z.number().int().positive()
});

export type DataModelConfig = z.infer<typeof DataModelConfigSchema>;

/**
 * Load data model configuration from environment
 * Fails fast if required variables are missing or invalid
 * @returns Validated data model configuration
 * @throws Error if configuration is invalid
 */
export function loadDataModelConfig(): DataModelConfig {
  const config = {
    maxEntitiesPerInvestigation: Number(
      process.env.REACT_APP_MAX_ENTITIES
    ),
    maxToolSelectionsPerInvestigation: Number(
      process.env.REACT_APP_MAX_TOOLS
    ),
    defaultRiskThreshold: Number(
      process.env.REACT_APP_DEFAULT_RISK_THRESHOLD
    ),
    defaultCorrelationMode: (process.env.REACT_APP_DEFAULT_CORRELATION_MODE as CorrelationMode),
    defaultExecutionMode: (process.env.REACT_APP_DEFAULT_EXECUTION_MODE as ExecutionMode),
    autoSaveIntervalMs: Number(
      process.env.REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS
    ),
    validationDebounceMs: Number(
      process.env.REACT_APP_WIZARD_VALIDATION_DEBOUNCE_MS
    ),
    progressUpdateIntervalMs: Number(
      process.env.REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS
    )
  };

  const parsed = DataModelConfigSchema.safeParse(config);

  if (!parsed.success) {
    console.error('Data model configuration validation failed:', parsed.error.format());
    throw new Error(
      'Invalid data model configuration – refusing to start. ' +
      'Check environment variables: REACT_APP_MAX_ENTITIES, REACT_APP_MAX_TOOLS, etc.'
    );
  }

  return parsed.data;
}

/**
 * Feature flag configuration schema
 */
export const WizardFeatureFlagsSchema = z.object({
  enableWizard: z.boolean(),
  enableTemplates: z.boolean(),
  enableMultiEntity: z.boolean(),
  enableLlmInsights: z.boolean(),
  enableRelationshipGraph: z.boolean()
});

export type WizardFeatureFlags = z.infer<typeof WizardFeatureFlagsSchema>;

/**
 * Load wizard feature flags from environment
 * @returns Validated feature flags
 * @throws Error if configuration is invalid
 */
export function loadWizardFeatureFlags(): WizardFeatureFlags {
  const flags = {
    enableWizard: process.env.REACT_APP_FEATURE_ENABLE_WIZARD === 'true',
    enableTemplates: process.env.REACT_APP_FEATURE_ENABLE_TEMPLATES === 'true',
    enableMultiEntity: process.env.REACT_APP_FEATURE_ENABLE_MULTI_ENTITY === 'true',
    enableLlmInsights: process.env.REACT_APP_FEATURE_ENABLE_LLM_INSIGHTS === 'true',
    enableRelationshipGraph: process.env.REACT_APP_FEATURE_ENABLE_RELATIONSHIP_GRAPH === 'true'
  };

  const parsed = WizardFeatureFlagsSchema.safeParse(flags);

  if (!parsed.success) {
    console.error('Wizard feature flags validation failed:', parsed.error.format());
    throw new Error('Invalid wizard feature flags configuration');
  }

  return parsed.data;
}
