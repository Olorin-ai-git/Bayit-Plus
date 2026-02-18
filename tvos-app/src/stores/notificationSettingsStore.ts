/**
 * Notification Settings Store for tvOS
 * Manages notification preferences with backend integration and optimistic updates
 */

import { create } from 'zustand';
import { api } from '@bayit/shared-services';
import type { NotificationSettings } from '@bayit/shared-types';
import { logger } from '../utils/logger';

interface NotificationSettingsState {
  settings: NotificationSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => Promise<void>;
}

export const useNotificationSettingsStore = create<NotificationSettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/profiles/preferences/notifications');

      set({
        settings: response,
        isLoading: false,
      });
    } catch (error: any) {
      logger.error('Failed to load notification settings', { error: error.message });
      set({
        error: error.message || 'Failed to load notification settings',
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
      await api.put('/profiles/preferences/notifications', {
        ...settings,
        [key]: value,
      });

      set({ isSaving: false });
    } catch (error: any) {
      logger.error('Failed to update notification setting', { key, error: error.message });
      set({
        settings: { ...settings, [key]: previousValue },
        error: error.message || 'Failed to update notification setting',
        isSaving: false,
      });
    }
  },
}));

export default useNotificationSettingsStore;
