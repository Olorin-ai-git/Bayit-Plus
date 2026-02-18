/**
 * Accessibility Settings Store for tvOS
 * Manages accessibility preferences with backend integration and optimistic updates
 */

import { create } from 'zustand';
import { api } from '@bayit/shared-services';
import type { AccessibilitySettings } from '@bayit/shared-types';
import { logger } from '../utils/logger';

interface AccessibilitySettingsState {
  settings: AccessibilitySettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ) => Promise<void>;
}

export const useAccessibilitySettingsStore = create<AccessibilitySettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/profiles/preferences/accessibility');

      set({
        settings: response,
        isLoading: false,
      });
    } catch (error: any) {
      logger.error('Failed to load accessibility settings', { error: error.message });
      set({
        error: error.message || 'Failed to load accessibility settings',
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
      await api.put('/profiles/preferences/accessibility', {
        ...settings,
        [key]: value,
      });

      set({ isSaving: false });
    } catch (error: any) {
      logger.error('Failed to update accessibility setting', { key, error: error.message });
      set({
        settings: { ...settings, [key]: previousValue },
        error: error.message || 'Failed to update accessibility setting',
        isSaving: false,
      });
    }
  },
}));

export default useAccessibilitySettingsStore;
