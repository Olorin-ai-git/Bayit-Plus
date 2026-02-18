/**
 * Subtitle Settings Store for tvOS
 * Manages subtitle display and AI translation preferences with backend integration
 */

import { create } from 'zustand';
import { api } from '@bayit/shared-services';
import type { SubtitlePreferences } from '@bayit/shared-types';
import { logger } from '../utils/logger';

interface SubtitleSettingsExtended extends SubtitlePreferences {
  ai_translation_enabled: boolean;
  translation_language: string;
}

interface SubtitleSettingsState {
  settings: SubtitleSettingsExtended | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof SubtitleSettingsExtended>(
    key: K,
    value: SubtitleSettingsExtended[K],
  ) => Promise<void>;
  updateDisplaySetting: (
    key: keyof SubtitleSettingsExtended['settings'],
    value: string,
  ) => Promise<void>;
}

export const useSubtitleSettingsStore = create<SubtitleSettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/profiles/preferences/subtitles');

      set({
        settings: response,
        isLoading: false,
      });
    } catch (error: any) {
      logger.error('Failed to load subtitle settings', { error: error.message });
      set({
        error: error.message || 'Failed to load subtitle settings',
        isLoading: false,
      });
    }
  },

  updateSetting: async (key, value) => {
    const { settings } = get();
    if (!settings) return;

    const previousValue = settings[key];
    set({
      settings: { ...settings, [key]: value },
      isSaving: true,
      error: null,
    });

    try {
      await api.put('/profiles/preferences/subtitles', {
        ...settings,
        [key]: value,
      });

      set({ isSaving: false });
    } catch (error: any) {
      logger.error('Failed to update subtitle setting', { key, error: error.message });
      set({
        settings: { ...settings, [key]: previousValue },
        error: error.message || 'Failed to update subtitle setting',
        isSaving: false,
      });
    }
  },

  updateDisplaySetting: async (key, value) => {
    const { settings } = get();
    if (!settings) return;

    const previousSettings = { ...settings.settings };
    const updatedDisplay = { ...settings.settings, [key]: value };
    set({
      settings: { ...settings, settings: updatedDisplay },
      isSaving: true,
      error: null,
    });

    try {
      await api.put('/profiles/preferences/subtitles', {
        ...settings,
        settings: updatedDisplay,
      });

      set({ isSaving: false });
    } catch (error: any) {
      logger.error('Failed to update subtitle display setting', { key, error: error.message });
      set({
        settings: { ...settings, settings: previousSettings },
        error: error.message || 'Failed to update subtitle display setting',
        isSaving: false,
      });
    }
  },
}));

export default useSubtitleSettingsStore;
