/**
 * Default Investigation Settings
 * Feature: 004-new-olorin-frontend
 *
 * Factory function for creating default investigation settings.
 */

import { InvestigationSettings, CorrelationMode, ExecutionMode } from '@shared/types/wizard.types';

/**
 * Create default investigation settings
 * Used to initialize wizard when no settings exist
 * Ensures all required properties are initialized with safe defaults
 */
export async function createDefaultSettings(): Promise<InvestigationSettings> {
  return {
    entities: [],
    primaryEntityId: null,
    correlationMode: CorrelationMode.OR,
    timeRange: {
      type: 'last_180d' as const,
      startDate: new Date(Date.now() - (180 + 14) * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      windowDays: 14
    },
    toolSelections: [],
    riskThreshold: 50,
    executionMode: ExecutionMode.PARALLEL,
    enableLlmInsights: true,
    enableRelationshipGraph: true,
    autoSelectEntities: true,
    investigationType: 'hybrid-graph', // Default to hybrid investigation
    validationErrors: [],
    isValid: false
  };
}

/**
 * Ensure settings object is valid and has all required properties
 * Used to normalize settings from store or API
 */
export function ensureValidSettings(settings: Partial<InvestigationSettings> | null | undefined): InvestigationSettings {
  // Get max lookback months from environment (default: 6 months)
  const maxLookbackMonths = parseInt(process.env.REACT_APP_ANALYTICS_MAX_LOOKBACK_MONTHS || '6', 10);
  const maxLookbackDays = maxLookbackMonths * 30;
  const windowDays = 14;
  
  // End date: capped at max_lookback_days ago
  const endDate = new Date(Date.now() - maxLookbackDays * 24 * 60 * 60 * 1000);
  // Start date: end_date - window_days
  const startDate = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  
  if (!settings) {
    return {
      entities: [],
      primaryEntityId: null,
      correlationMode: CorrelationMode.OR,
      timeRange: {
        type: 'last_180d' as const,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        windowDays: windowDays
      },
      toolSelections: [],
      riskThreshold: 50,
      executionMode: ExecutionMode.PARALLEL,
      enableLlmInsights: true,
      enableRelationshipGraph: true,
      autoSelectEntities: true,
      validationErrors: [],
      isValid: false
    };
  }

  return {
    entities: Array.isArray(settings.entities) ? settings.entities : [],
    primaryEntityId: settings.primaryEntityId ?? null,
    correlationMode: settings.correlationMode ?? CorrelationMode.OR,
    timeRange: settings.timeRange ?? {
      type: 'last_180d' as const,
      startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    },
    toolSelections: Array.isArray(settings.toolSelections) ? settings.toolSelections : [],
    riskThreshold: settings.riskThreshold ?? 50,
    executionMode: settings.executionMode ?? ExecutionMode.PARALLEL,
    enableLlmInsights: settings.enableLlmInsights ?? true,
    enableRelationshipGraph: settings.enableRelationshipGraph ?? true,
    autoSelectEntities: settings.autoSelectEntities ?? true,
    investigationType: settings.investigationType ?? 'hybrid-graph', // Default to hybrid if not specified
    validationErrors: settings.validationErrors ?? [],
    isValid: settings.isValid ?? false
  };
}
