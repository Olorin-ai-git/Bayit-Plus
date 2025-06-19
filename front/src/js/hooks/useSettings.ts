import { useState, useEffect } from 'react';

/**
 * Persisted settings for the Olorin Web Plugin.
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

const STORAGE_KEY = 'olorin_webplugin_settings';

/**
 * Hook to get and set user settings, persisted to localStorage.
 * @returns [settings, setSettings]
 */
export function useSettings(): [
  Settings,
  React.Dispatch<React.SetStateAction<Settings>>,
] {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as Settings;
      }
    } catch {
      // ignore
    }
    return {
      defaultEntityType: 'user_id',
      selectedAgents: [],
      commentPrefix: '',
      agentToolsMapping: {},
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  return [settings, setSettings];
}
