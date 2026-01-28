/**
 * Settings Store
 *
 * Manages user preferences and settings using Zustand
 */

import { create } from 'zustand';
import { logger } from '../../lib/logger';

export interface Settings {
  // Language preferences
  targetLanguage: 'en' | 'es';
  voiceId: string;

  // Volume preferences
  originalVolume: number; // 0-100
  dubbedVolume: number;   // 0-100

  // Feature toggles
  audioDubbing: boolean;
  liveSubtitles: boolean;
  subtitleLanguage: string | null;

  // UI preferences
  showTranscript: boolean;
  autoStart: boolean;
}

interface SettingsState extends Settings {
  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  clearError: () => void;
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: Settings = {
  targetLanguage: 'en',
  voiceId: 'voice_en_male_1',
  originalVolume: 20,
  dubbedVolume: 80,
  audioDubbing: true,
  liveSubtitles: false,
  subtitleLanguage: null,
  showTranscript: false,
  autoStart: false,
};

/**
 * Settings store
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state (defaults)
  ...DEFAULT_SETTINGS,
  isLoading: true,
  error: null,

  /**
   * Initialize settings from storage
   */
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      const result = await chrome.storage.sync.get('settings');
      const settings: Settings = result.settings || DEFAULT_SETTINGS;

      set({
        ...settings,
        isLoading: false,
      });

      logger.info('Settings initialized', { settings });
    } catch (error) {
      logger.error('Failed to initialize settings', { error: String(error) });
      set({
        ...DEFAULT_SETTINGS,
        error: String(error),
        isLoading: false,
      });
    }
  },

  /**
   * Update settings
   */
  updateSettings: async (updates: Partial<Settings>) => {
    try {
      const currentSettings = { ...get() };
      const newSettings: Settings = {
        targetLanguage: updates.targetLanguage ?? currentSettings.targetLanguage,
        voiceId: updates.voiceId ?? currentSettings.voiceId,
        originalVolume: updates.originalVolume ?? currentSettings.originalVolume,
        dubbedVolume: updates.dubbedVolume ?? currentSettings.dubbedVolume,
        audioDubbing: updates.audioDubbing ?? currentSettings.audioDubbing,
        liveSubtitles: updates.liveSubtitles ?? currentSettings.liveSubtitles,
        subtitleLanguage: updates.subtitleLanguage ?? currentSettings.subtitleLanguage,
        showTranscript: updates.showTranscript ?? currentSettings.showTranscript,
        autoStart: updates.autoStart ?? currentSettings.autoStart,
      };

      // Save to storage
      await chrome.storage.sync.set({ settings: newSettings });

      // Update state
      set({
        ...newSettings,
        error: null,
      });

      logger.info('Settings updated', { updates });

      // Notify content script of settings change
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'SETTINGS_UPDATED',
            settings: newSettings,
          }).catch(() => {
            // Content script may not be loaded yet
            logger.debug('Could not notify content script of settings change');
          });
        }
      });
    } catch (error) {
      logger.error('Failed to update settings', { error: String(error) });
      set({ error: String(error) });
    }
  },

  /**
   * Reset settings to defaults
   */
  resetToDefaults: async () => {
    try {
      await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });

      set({
        ...DEFAULT_SETTINGS,
        error: null,
      });

      logger.info('Settings reset to defaults');
    } catch (error) {
      logger.error('Failed to reset settings', { error: String(error) });
      set({ error: String(error) });
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },
}));
