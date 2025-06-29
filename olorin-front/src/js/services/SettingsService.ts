/**
 * Service for managing user settings with server-side persistence and session storage overrides.
 */

export interface Settings {
  /** Default entity type for investigations (user_id or device_id) */
  defaultEntityType: 'user_id' | 'device_id';
  /** Agents selected by default for investigations */
  selectedAgents: string[];
  /** Prefix text to prepend to comments */
  commentPrefix: string;
  /** Mapping of agent name to list of tools */
  agentToolsMapping: Record<string, string[]>;
}

export interface SettingsResponse {
  success: boolean;
  message: string;
  settings?: Settings;
}

export interface ToolDisplayInfo {
  name: string;
  display_name: string;
  description: string;
}

export interface CategorizedToolsResponse {
  olorin_tools: ToolDisplayInfo[];
  mcp_tools: ToolDisplayInfo[];
}

const SESSION_STORAGE_KEY = 'olorin_session_settings_override';

/**
 * Get the base API URL for backend requests
 */
function getApiBaseUrl(): string {
  // In development with proxy, use relative URLs
  // In production, this would be configured via environment variables
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Check if we have a proxy configured (relative URLs work)
  if (isDevelopment) {
    // First try relative URLs (works with proxy)
    return '';
  }
  
  // Fallback to explicit backend URL
  return process.env.REACT_APP_BACKEND_URL || 'http://localhost:8090';
}

/**
 * Convert frontend settings format to backend API format
 */
function toApiFormat(settings: Settings) {
  return {
    default_entity_type: settings.defaultEntityType,
    selected_agents: settings.selectedAgents,
    comment_prefix: settings.commentPrefix,
    agent_tools_mapping: settings.agentToolsMapping,
  };
}

/**
 * Convert backend API format to frontend settings format
 */
function fromApiFormat(apiSettings: any): Settings {
  return {
    defaultEntityType: apiSettings.default_entity_type || 'user_id',
    selectedAgents: apiSettings.selected_agents || [],
    commentPrefix: apiSettings.comment_prefix || '',
    agentToolsMapping: apiSettings.agent_tools_mapping || {},
  };
}

/**
 * Get default settings
 */
export function getDefaultSettings(): Settings {
  // Import available agents from investigation steps config
  const { allPossibleSteps } = require('../utils/investigationStepsConfig');
  const allAgents = allPossibleSteps.map((step: any) => step.agent);
  
  return {
    defaultEntityType: 'user_id',
    selectedAgents: allAgents, // Select all agents by default
    commentPrefix: '',
    agentToolsMapping: {},
  };
}

/**
 * Load settings from server
 */
export async function loadSettingsFromServer(): Promise<Settings> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/settings/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': 'default_user', // In production, this would come from auth
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load settings: ${response.status}`);
    }

    const data: SettingsResponse = await response.json();
    
    if (!data.success || !data.settings) {
      throw new Error(data.message || 'Failed to load settings');
    }

    return fromApiFormat(data.settings);
  } catch (error) {
    console.warn('Failed to load settings from server, using defaults:', error);
    return getDefaultSettings();
  }
}

/**
 * Save settings to server
 */
export async function saveSettingsToServer(settings: Settings): Promise<void> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/settings/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': 'default_user', // In production, this would come from auth
      },
      body: JSON.stringify(toApiFormat(settings)),
    });

    if (!response.ok) {
      throw new Error(`Failed to save settings: ${response.status}`);
    }

    const data: SettingsResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to save settings');
    }

    console.log('Settings saved to server successfully');
  } catch (error) {
    console.error('Failed to save settings to server:', error);
    throw error;
  }
}

/**
 * Get session storage overrides
 */
export function getSessionOverrides(): Partial<Settings> | null {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Partial<Settings>;
    }
  } catch (error) {
    console.warn('Failed to parse session storage overrides:', error);
  }
  return null;
}

/**
 * Set session storage overrides
 */
export function setSessionOverrides(overrides: Partial<Settings>): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.warn('Failed to save session storage overrides:', error);
  }
}

/**
 * Clear session storage overrides
 */
export function clearSessionOverrides(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear session storage overrides:', error);
  }
}

/**
 * Merge server settings with session overrides
 */
export function mergeSettingsWithOverrides(
  serverSettings: Settings,
  sessionOverrides: Partial<Settings> | null
): Settings {
  if (!sessionOverrides) {
    return serverSettings;
  }

  return {
    ...serverSettings,
    ...sessionOverrides,
  };
}

/**
 * Get effective settings (server + session overrides)
 */
export async function getEffectiveSettings(): Promise<Settings> {
  const serverSettings = await loadSettingsFromServer();
  const sessionOverrides = getSessionOverrides();
  return mergeSettingsWithOverrides(serverSettings, sessionOverrides);
}

/**
 * Update a specific setting with session override
 */
export function updateSettingWithOverride<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): void {
  const currentOverrides = getSessionOverrides() || {};
  const newOverrides = {
    ...currentOverrides,
    [key]: value,
  };
  setSessionOverrides(newOverrides);
}

/**
 * Reset settings to server defaults (clear session overrides)
 */
export function resetToServerSettings(): void {
  clearSessionOverrides();
}

/**
 * Save current session overrides to server permanently
 */
export async function commitSessionOverridesToServer(): Promise<void> {
  const effectiveSettings = await getEffectiveSettings();
  await saveSettingsToServer(effectiveSettings);
  clearSessionOverrides();
}

/**
 * Get categorized tools (Olorin vs MCP)
 */
export async function getCategorizedTools(): Promise<CategorizedToolsResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/settings/tools-by-category`);
    if (!response.ok) {
      throw new Error(`Failed to fetch categorized tools: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching categorized tools:', error);
    throw error;
  }
}

 