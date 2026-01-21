/**
 * Settings Serializer - Convert Frontend Settings to Backend Format
 * Transforms camelCase/extra fields to match backend Pydantic schema exactly
 */

import { InvestigationSettings as FrontendSettings } from '../types/wizardState';

export interface BackendInvestigationSettings {
  name?: string;
  entities: Array<{ entity_type: string; entity_value: string }>;
  time_range: { start_time: string; end_time: string; window_days?: number };
  tools: Array<{ tool_name: string; enabled: boolean; config?: Record<string, any> }>;
  correlation_mode: string;
  investigation_type?: 'structured' | 'hybrid'; // Backend expects 'hybrid' not 'hybrid-graph'
}

/**
 * Convert frontend settings to backend format
 * Removes extra fields (autoSelectEntities, executionMode, riskThreshold, etc)
 *
 * @param settings - Frontend investigation settings
 * @param investigationType - Optional investigation type ('structured' | 'hybrid-graph')
 *                            For hybrid-graph, tool selection is not required
 *                            NOTE: 'hybrid-graph' is mapped to 'hybrid' for backend compatibility
 */
export function serializeSettingsForBackend(
  settings: any,
  investigationType?: 'structured' | 'hybrid-graph'
): BackendInvestigationSettings {
  if (!settings) {
    throw new Error('Settings are required');
  }

  console.debug('[serializeSettingsForBackend] Input settings:', JSON.stringify(settings, null, 2));
  console.debug('[serializeSettingsForBackend] Investigation type:', investigationType || 'structured (default)');

  // Generate default name if not provided
  const investigationName = settings.name?.trim() || `Investigation-${new Date().toISOString().split('T')[0]}-${Date.now()}`;

  // TimeRangePicker returns { startDate, endDate } structure
  const timeRange = settings.time_range || settings.timeRange;
  if (!timeRange) {
    console.error('[serializeSettingsForBackend] No time range found in settings');
    throw new Error('Time range is required');
  }

  // Handle multiple field name conventions for time range
  const startTime = timeRange.start_time || timeRange.startTime || timeRange.start || timeRange.startDate;
  const endTime = timeRange.end_time || timeRange.endTime || timeRange.end || timeRange.endDate;
  const windowDays = timeRange.window_days || timeRange.windowDays || 14;

  if (!startTime || !endTime) {
    console.error('[serializeSettingsForBackend] Missing start/end time:', { startTime, endTime, timeRange });
    throw new Error('Start and end times are required');
  }

  const correlationMode = settings.correlation_mode || settings.correlationMode || 'OR';
  console.debug('[serializeSettingsForBackend] Correlation mode:', correlationMode);

  // Handle entities - if auto-select or empty, create placeholder
  let entities = settings.entities || [];
  if (settings.autoSelectEntities && entities.length === 0) {
    // Send a placeholder entity for auto-select mode
    entities = [{ entity_type: 'user_id', entity_value: 'auto-select' }];
  }

  if (entities.length === 0) {
    throw new Error('At least one entity is required (or use auto-select)');
  }

  // Handle tools - map from toolSelections to backend format
  // For hybrid-graph investigations, the LLM chooses tools automatically
  // so tool selection is optional
  let toolSelections = settings.toolSelections || settings.tools || [];

  // Only validate tool requirement for structured investigations
  if (investigationType !== 'hybrid-graph') {
    if (toolSelections.length === 0) {
      throw new Error('At least one tool must be selected');
    }

    // Filter to only enabled tools
    toolSelections = toolSelections.filter((t: any) =>
      t.isEnabled === true || t.enabled === true
    );

    if (toolSelections.length === 0) {
      throw new Error('At least one tool must be enabled');
    }
  } else {
    // For hybrid-graph, filter enabled tools if any are provided,
    // but empty tool list is acceptable
    if (toolSelections.length > 0) {
      toolSelections = toolSelections.filter((t: any) =>
        t.isEnabled === true || t.enabled === true
      );
    }
  }

  // Validate tools have required fields (only if tools are provided)
  if (toolSelections.length > 0) {
    const invalidTools = toolSelections.filter((t: any) => !t.toolName && !t.tool_name);
    if (invalidTools.length > 0) {
      throw new Error('All tools must have a toolName or tool_name');
    }
  }

  // Format datetime - ensure valid ISO 8601 strings
  const formatDateTime = (dt: any): string => {
    if (!dt) {
      throw new Error('Start and end times are required');
    }
    // If already a string, ensure it has Z suffix for UTC
    if (typeof dt === 'string') {
      const trimmed = dt.trim();
      // If it doesn't have timezone info and looks like datetime, add Z
      if (!trimmed.includes('Z') && !trimmed.includes('+') && !trimmed.includes('-')) {
        return trimmed + 'Z';
      }
      return trimmed;
    }
    // If Date object, convert to ISO string
    if (dt instanceof Date) {
      return dt.toISOString();
    }
    // If number (timestamp), convert to ISO
    if (typeof dt === 'number') {
      return new Date(dt).toISOString();
    }
    throw new Error(`Invalid datetime format: ${dt}`);
  };

  // Group tools by tool name and collect agent IDs for each tool
  // Backend needs to know which agents will use each tool
  // For hybrid-graph, tools array may be empty (LLM will choose)
  const toolsMap = new Map<string, any>();
  toolSelections.forEach((t: any) => {
    const toolName = t.toolName || t.tool_name || t.name || '';
    const agentId = t.agentId || t.agent_id || '';

    if (!toolName) return;

    if (!toolsMap.has(toolName)) {
      toolsMap.set(toolName, {
        tool_name: toolName,
        enabled: t.isEnabled !== undefined ? t.isEnabled : (t.enabled !== undefined ? t.enabled : true),
        config: {
          ...(t.config || {}),
          agents: [agentId] // Track which agents use this tool
        }
      });
    } else {
      // Add agent to existing tool's config
      const existing = toolsMap.get(toolName);
      if (agentId && !existing.config.agents.includes(agentId)) {
        existing.config.agents.push(agentId);
      }
    }
  });

  const uniqueTools = Array.from(toolsMap.values());
  console.debug('[serializeSettingsForBackend] Deduplicated tools with agent mapping:', {
    investigationType,
    original: toolSelections.length,
    deduplicated: uniqueTools.length,
    tools: uniqueTools.map((t: any) => ({ tool: t.tool_name, agents: t.config.agents }))
  });

  // Map frontend investigation type to backend format
  // Frontend uses 'hybrid-graph', backend expects 'hybrid'
  const backendInvestigationType = investigationType === 'hybrid-graph' ? 'hybrid' : (investigationType || 'structured');

  // Serialize to backend format
  const serialized: BackendInvestigationSettings = {
    name: investigationName,
    entities: entities.map((e: any) => ({
      // Handle both snake_case and camelCase formats
      entity_type: e.entity_type || e.type || 'user_id',
      entity_value: e.entity_value || e.value || ''
    })),
    time_range: {
      start_time: formatDateTime(startTime),
      end_time: formatDateTime(endTime),
      window_days: windowDays
    },
    tools: uniqueTools,
    correlation_mode: correlationMode,
    investigation_type: backendInvestigationType // Map 'hybrid-graph' -> 'hybrid'
  };

  console.debug('[serializeSettingsForBackend] Serialized payload:', {
    ...serialized,
    toolsCount: serialized.tools.length,
    investigationType: serialized.investigation_type
  });

  return serialized;
}

/**
 * Deserialize backend settings to frontend format
 * Maps backend investigation type to frontend format
 *
 * @param backendSettings - Backend investigation settings
 * @returns Frontend investigation settings with proper type mapping
 */
export function deserializeSettingsFromBackend(backendSettings: any): any {
  if (!backendSettings) {
    return backendSettings;
  }

  // Map backend 'hybrid' to frontend 'hybrid-graph'
  const frontendInvestigationType =
    backendSettings.investigation_type === 'hybrid'
      ? 'hybrid-graph'
      : backendSettings.investigation_type;

  return {
    ...backendSettings,
    investigation_type: frontendInvestigationType,
    investigationType: frontendInvestigationType // Also provide camelCase version
  };
}
