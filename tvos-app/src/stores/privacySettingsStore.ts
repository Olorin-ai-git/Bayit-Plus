/**
 * Privacy Settings Store for tvOS
 * Manages privacy preferences with backend integration and optimistic updates
 */

import { create } from 'zustand';
import { api } from '@bayit/shared-services';
import type { PrivacySettings } from '@bayit/shared-types';
import { logger } from '../utils/logger';

interface PrivacySettingsState {
  settings: PrivacySettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSetting: (key: keyof PrivacySettings, value: boolean) => Promise<void>;
  clearWatchHistory: () => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  requestDataExport: () => Promise<void>;
  requestDeleteAllData: () => Promise<void>;
}

export const usePrivacySettingsStore = create<PrivacySettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/profiles/preferences/privacy');

      set({
        settings: response,
        isLoading: false,
      });
    } catch (error: any) {
      logger.error('Failed to load privacy settings', { error: error.message });
      set({
        error: error.message || 'Failed to load privacy settings',
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
      await api.put('/profiles/preferences/privacy', {
        ...settings,
        [key]: value,
      });

      set({ isSaving: false });
    } catch (error: any) {
      logger.error('Failed to update privacy setting', { key, error: error.message });
      set({
        settings: { ...settings, [key]: previousValue },
        error: error.message || 'Failed to update privacy setting',
        isSaving: false,
      });
    }
  },

  clearWatchHistory: async () => {
    set({ isSaving: true, error: null });

    try {
      await api.delete('/history/watch');
      set({ isSaving: false });
    } catch (error: any) {
      logger.error('Failed to clear watch history', { error: error.message });
      set({
        error: error.message || 'Failed to clear watch history',
        isSaving: false,
      });
    }
  },

  clearSearchHistory: async () => {
    set({ isSaving: true, error: null });

    try {
      await api.delete('/history/search');
      set({ isSaving: false });
    } catch (error: any) {
      logger.error('Failed to clear search history', { error: error.message });
      set({
        error: error.message || 'Failed to clear search history',
        isSaving: false,
      });
    }
  },

  requestDataExport: async () => {
    set({ isSaving: true, error: null });

    try {
      await api.post('/privacy/export');
      set({ isSaving: false });
    } catch (error: any) {
      logger.error('Failed to request data export', { error: error.message });
      set({
        error: error.message || 'Failed to request data export',
        isSaving: false,
      });
    }
  },

  requestDeleteAllData: async () => {
    set({ isSaving: true, error: null });

    try {
      await api.post('/privacy/delete-all');
      set({ isSaving: false });
    } catch (error: any) {
      logger.error('Failed to request data deletion', { error: error.message });
      set({
        error: error.message || 'Failed to request data deletion',
        isSaving: false,
      });
    }
  },
}));

export default usePrivacySettingsStore;
