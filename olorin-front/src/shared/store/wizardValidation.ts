/**
 * Wizard Validation Utilities
 * Feature: 005-polling-and-persistence
 *
 * Validation and helper functions for wizard store.
 * Extracted from wizardStoreActions.ts to maintain < 200 line limit.
 *
 * SYSTEM MANDATE Compliance:
 * - Fail-fast validation - NO defaults, NO fallbacks, NO mock data
 * - Throws errors for missing required fields
 */

import { InvestigationSettings, PollingState } from '../types/wizardState';
import { CorrelationMode, ExecutionMode } from '../types/wizard.types';
import { toolCategories } from '../../microservices/investigation/constants/toolCategories';

export const initialPollingState: PollingState = {
  isPolling: false,
  currentInterval: 0,
  retryCount: 0,
  lastPollTime: null,
  error: null
};

/**
 * Get all available tools with default enabled=true
 */
export function getAllToolsEnabled() {
  return toolCategories.flatMap(category =>
    category.tools.map(tool => ({
      tool_name: tool.id,
      enabled: true,
      config: {}
    }))
  );
}

/**
 * Generate default investigation name with UUID
 */
export function generateDefaultInvestigationName(): string {
  const uuid = crypto.randomUUID();
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `Investigation_${timestamp}_${uuid.substring(0, 8)}`;
}

/**
 * Generate default time range (last 1 month)
 */
export function generateDefaultTimeRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1); // 1 month ago

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
}

/**
 * Validate required investigation settings
 * SYSTEM MANDATE COMPLIANCE: Fail-fast validation - NO defaults, NO fallbacks, NO mock data
 * Throws error if required fields are missing
 */
export function validateRequiredSettings(settings: Partial<InvestigationSettings> | null | undefined): InvestigationSettings {
  if (!settings) {
    throw new Error('Investigation settings are required. Cannot create investigation without user-provided settings.');
  }

  // Entities are only required for entity-based (specific) investigations
  // Risk-based investigations (autoSelectEntities=true) don't require manual entity selection
  if (!settings.autoSelectEntities) {
    if (!Array.isArray(settings.entities) || settings.entities.length === 0) {
      throw new Error('At least one entity is required for investigation.');
    }
  }

  if (!settings.timeRange) {
    throw new Error('Time range is required for investigation.');
  }

  if (!Array.isArray(settings.toolSelections) || settings.toolSelections.length === 0) {
    throw new Error('At least one analysis tool must be selected.');
  }

  // Return validated settings with required fields
  // Only these specific enum defaults are allowed (not business data)
  return {
    entities: settings.entities || [],
    primaryEntityId: settings.primaryEntityId ?? null,
    timeRange: settings.timeRange,
    toolSelections: settings.toolSelections,
    correlationMode: settings.correlationMode ?? CorrelationMode.OR,
    executionMode: settings.executionMode ?? ExecutionMode.PARALLEL,
    riskThreshold: settings.riskThreshold ?? 50,
    enableLlmInsights: settings.enableLlmInsights ?? true,
    enableRelationshipGraph: settings.enableRelationshipGraph ?? true,
    autoSelectEntities: settings.autoSelectEntities ?? false,
    validationErrors: settings.validationErrors ?? [],
    isValid: settings.isValid ?? false
  };
}
