import { useState, useEffect } from 'react';
import { 
  Settings,
  getEffectiveSettings,
  saveSettingsToServer,
  updateSettingWithOverride,
  getDefaultSettings,
  getSessionOverrides,
  setSessionOverrides
} from '../services/SettingsService';



/**
 * Hook to get and set user settings with server-side persistence and session overrides.
 * 
 * Settings are loaded from the server on initialization and saved to the server when changed.
 * Session-specific overrides are stored in sessionStorage and take precedence over server settings.
 * 
 * @returns [settings, setSettings, isLoading, error, hasSessionOverrides, commitToServer, resetToServer]
 */
export function useSettings(): [
  Settings,
  React.Dispatch<React.SetStateAction<Settings>>,
  boolean,
  string | null,
  boolean,
  () => Promise<void>,
  () => void
] {
  const [settings, setSettingsState] = useState<Settings>(getDefaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSessionOverrides, setHasSessionOverrides] = useState(false);

  // Load settings from server on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const effectiveSettings = await getEffectiveSettings();
        setSettingsState(effectiveSettings);
        
        // Check if there are session overrides
        const sessionOverrides = getSessionOverrides();
        setHasSessionOverrides(sessionOverrides !== null && Object.keys(sessionOverrides).length > 0);
        
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load settings');
        setSettingsState(getDefaultSettings());
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Custom setter that handles session overrides
  const setSettings = (updater: React.SetStateAction<Settings>) => {
    setSettingsState(prevSettings => {
      const newSettings = typeof updater === 'function' ? updater(prevSettings) : updater;
      
      // Update session overrides for any changes
      const sessionOverrides = getSessionOverrides() || {};
      const hasChanges = JSON.stringify(newSettings) !== JSON.stringify(prevSettings);
      
      if (hasChanges) {
        // Store the entire new settings as session override
        setSessionOverrides(newSettings);
        setHasSessionOverrides(true);
      }
      
      return newSettings;
    });
  };

  // Commit session overrides to server permanently
  const commitToServer = async () => {
    try {
      setError(null);
      await saveSettingsToServer(settings);
      
      // Clear session overrides after successful save
      const { commitSessionOverridesToServer } = await import('../services/SettingsService');
      await commitSessionOverridesToServer();
      
      setHasSessionOverrides(false);
      console.log('Settings committed to server successfully');
    } catch (err) {
      console.error('Failed to commit settings to server:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err;
    }
  };

  // Reset to server settings (clear session overrides)
  const resetToServer = () => {
    const { resetToServerSettings } = require('../services/SettingsService');
    resetToServerSettings();
    setHasSessionOverrides(false);
    
    // Reload settings from server
    getEffectiveSettings().then(effectiveSettings => {
      setSettingsState(effectiveSettings);
    }).catch(err => {
      console.error('Failed to reload settings after reset:', err);
      setError(err instanceof Error ? err.message : 'Failed to reload settings');
    });
  };

  return [
    settings, 
    setSettings, 
    isLoading, 
    error, 
    hasSessionOverrides, 
    commitToServer, 
    resetToServer
  ];
}
