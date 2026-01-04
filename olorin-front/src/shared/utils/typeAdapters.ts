/**
 * Type Adapters for Investigation Settings
 *
 * Provides conversion between camelCase (frontend Zod schema) and snake_case (backend API)
 * formats for investigation settings and related types.
 */

import type {
  InvestigationSettings as FrontendSettings,
  TimeRange as FrontendTimeRange,
  ToolSelection as FrontendToolSelection
} from '../types/wizard.types';
import type {
  InvestigationSettings as BackendSettings,
  TimeRange as BackendTimeRange,
  ToolSelection as BackendToolSelection
} from '../types/wizardState';
import { CorrelationMode, ExecutionMode } from '../types/wizard.types';
import { TimeRangeType } from '../types/wizard.schemas.base';

/**
 * Convert frontend TimeRange to backend format
 */
export function toBackendTimeRange(frontend: FrontendTimeRange): BackendTimeRange {
  return {
    start_time: frontend.startDate,
    end_time: frontend.endDate,
    window_days: frontend.windowDays || 14
  };
}

/**
 * Convert backend TimeRange to frontend format
 */
export function toFrontendTimeRange(backend: BackendTimeRange): FrontendTimeRange {
  return {
    type: 'custom' as TimeRangeType,
    startDate: backend.start_time,
    endDate: backend.end_time,
    relativeDescription: undefined,
    windowDays: (backend as any).window_days || 14
  };
}

/**
 * Convert frontend ToolSelection to backend format
 */
export function toBackendToolSelection(frontend: FrontendToolSelection): BackendToolSelection {
  return {
    tool_name: frontend.toolName,
    enabled: frontend.isEnabled,
    config: {}
  };
}

/**
 * Convert backend ToolSelection to frontend format
 */
export function toFrontendToolSelection(backend: BackendToolSelection): FrontendToolSelection {
  return {
    toolId: backend.tool_name,
    toolName: backend.tool_name,
    agentId: 'default',
    agentName: 'Default Agent',
    priority: 5,
    isEnabled: backend.enabled
  };
}

/**
 * Convert frontend (Zod schema) InvestigationSettings to backend API format
 */
export function toBackendSettings(frontend: FrontendSettings): any {
  return {
    name: frontend.entities[0]?.value || 'Investigation',
    entities: frontend.entities,
    autoSelectEntities: false,
    time_range: toBackendTimeRange(frontend.timeRange),
    tools: frontend.toolSelections.map(toBackendToolSelection),
    correlation_mode: frontend.correlationMode
  };
}

/**
 * Convert backend API InvestigationSettings to frontend (Zod schema) format
 */
export function toFrontendSettings(backend: any): FrontendSettings {
  return {
    entities: backend.entities || [],
    primaryEntityId: backend.entities?.[0]?.id || null,
    correlationMode: backend.correlation_mode || backend.correlationMode || CorrelationMode.OR,
    timeRange: toFrontendTimeRange(backend.time_range || backend.timeRange),
    toolSelections: (backend.tools || []).map(toFrontendToolSelection),
    riskThreshold: 50,
    executionMode: ExecutionMode.PARALLEL,
    enableLlmInsights: true,
    enableRelationshipGraph: true,
    validationErrors: [],
    isValid: true
  };
}

/**
 * Type guard to check if settings object is in frontend format
 */
export function isFrontendSettings(settings: any): settings is FrontendSettings {
  return settings && 'timeRange' in settings && 'toolSelections' in settings;
}

/**
 * Type guard to check if settings object is in backend format
 */
export function isBackendSettings(settings: any): settings is BackendSettings {
  return settings && 'time_range' in settings && 'tools' in settings;
}

/**
 * Normalize settings to frontend format (handles both formats)
 */
export function normalizeSettings(settings: FrontendSettings | BackendSettings): FrontendSettings {
  if (isFrontendSettings(settings)) {
    return settings;
  }
  if (isBackendSettings(settings)) {
    return toFrontendSettings(settings);
  }
  throw new Error('Invalid settings format');
}
