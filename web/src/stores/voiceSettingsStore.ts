/**
 * Voice & Accessibility Settings Store
 * Manages voice search and accessibility preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { profilesService } from '@/services/api';
import logger from '@/utils/logger';

export type VoiceLanguage = 'he' | 'en' | 'es';
export type TextSize = 'small' | 'medium' | 'large';

export interface VoicePreferences {
  voice_search_enabled: boolean;
  voice_language: VoiceLanguage;
  auto_subtitle: boolean;
  high_contrast_mode: boolean;
  text_size: TextSize;
}

const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  voice_search_enabled: true,
  voice_language: 'he',
  auto_subtitle: false,
  high_contrast_mode: false,
  text_size: 'medium',
};

interface VoiceSettingsStore {
  preferences: VoicePreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<VoicePreferences>) => Promise<void>;
  toggleSetting: (key: 'voice_search_enabled' | 'auto_subtitle' | 'high_contrast_mode') => Promise<void>;
  setVoiceLanguage: (language: VoiceLanguage) => Promise<void>;
  setTextSize: (size: TextSize) => Promise<void>;
  resetToDefaults: () => void;
}

export const useVoiceSettingsStore = create<VoiceSettingsStore>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_VOICE_PREFERENCES,
      loading: false,
      saving: false,
      error: null,

      loadPreferences: async () => {
        set({ loading: true, error: null });
        try {
          const data = await profilesService.getVoicePreferences();
          set({
            preferences: { ...DEFAULT_VOICE_PREFERENCES, ...data },
            loading: false,
          });
        } catch (error: any) {
          logger.error('Failed to load voice preferences', 'voiceSettingsStore', error);
          set({ loading: false, error: error.message || 'Failed to load preferences' });
        }
      },

      updatePreferences: async (updates) => {
        const current = get().preferences;
        const updated = { ...current, ...updates };

        // Optimistic update
        set({ preferences: updated, saving: true, error: null });

        try {
          await profilesService.updateVoicePreferences(updated);
          set({ saving: false });
        } catch (error: any) {
          // Rollback on error
          logger.error('Failed to update voice preferences', 'voiceSettingsStore', error);
          set({
            preferences: current,
            saving: false,
            error: error.message || 'Failed to save preferences',
          });
        }
      },

      toggleSetting: async (key) => {
        const current = get().preferences;
        await get().updatePreferences({ [key]: !current[key] });
      },

      setVoiceLanguage: async (language) => {
        await get().updatePreferences({ voice_language: language });
      },

      setTextSize: async (size) => {
        await get().updatePreferences({ text_size: size });
      },

      resetToDefaults: () => {
        set({ preferences: DEFAULT_VOICE_PREFERENCES });
      },
    }),
    {
      name: 'bayit-voice-settings',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);

export default useVoiceSettingsStore;
