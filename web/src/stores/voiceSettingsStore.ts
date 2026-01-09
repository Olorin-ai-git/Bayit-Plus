/**
 * Voice & Accessibility Settings Store
 * Manages voice search, constant listening, and accessibility preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { profilesService } from '@/services/api';
import logger from '@/utils/logger';

export type VoiceLanguage = 'he' | 'en' | 'es';
export type TextSize = 'small' | 'medium' | 'large';
export type VADSensitivity = 'low' | 'medium' | 'high';

export interface VoicePreferences {
  voice_search_enabled: boolean;
  constant_listening_enabled: boolean;
  // Note: voice_language is now derived from i18n.language instead of stored
  auto_subtitle: boolean;
  high_contrast_mode: boolean;
  text_size: TextSize;
  hold_button_mode: boolean;
  silence_threshold_ms: number;
  vad_sensitivity: VADSensitivity;
  // Wake word settings
  wake_word_enabled: boolean;
  wake_word: string;
  wake_word_sensitivity: number;
  wake_word_cooldown_ms: number;
}

const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  voice_search_enabled: true,
  constant_listening_enabled: false,  // DISABLED - use wake word instead
  auto_subtitle: false,
  high_contrast_mode: false,
  text_size: 'medium',
  hold_button_mode: false,
  silence_threshold_ms: 2000,
  vad_sensitivity: 'medium',
  // Wake word settings
  wake_word_enabled: true,           // Wake word detection ENABLED by default - listen for "Hi Bayit"
  wake_word: 'hi bayit',
  wake_word_sensitivity: 0.7,
  wake_word_cooldown_ms: 2000,
};

interface VoiceSettingsStore {
  preferences: VoicePreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<VoicePreferences>) => Promise<void>;
  toggleSetting: (key: keyof Pick<VoicePreferences,
    'voice_search_enabled' |
    'constant_listening_enabled' |
    'auto_subtitle' |
    'high_contrast_mode' |
    'hold_button_mode' |
    'wake_word_enabled'
  >) => Promise<void>;
  setTextSize: (size: TextSize) => Promise<void>;
  setVADSensitivity: (sensitivity: VADSensitivity) => Promise<void>;
  setSilenceThreshold: (ms: number) => Promise<void>;
  setWakeWordEnabled: (enabled: boolean) => Promise<void>;
  setWakeWordSensitivity: (sensitivity: number) => Promise<void>;
  setWakeWordCooldown: (ms: number) => Promise<void>;
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

      setTextSize: async (size) => {
        await get().updatePreferences({ text_size: size });
      },

      setVADSensitivity: async (sensitivity) => {
        await get().updatePreferences({ vad_sensitivity: sensitivity });
      },

      setSilenceThreshold: async (ms) => {
        // Clamp between 1-5 seconds
        const clampedMs = Math.max(1000, Math.min(5000, ms));
        await get().updatePreferences({ silence_threshold_ms: clampedMs });
      },

      setWakeWordEnabled: async (enabled) => {
        await get().updatePreferences({ wake_word_enabled: enabled });
      },

      setWakeWordSensitivity: async (sensitivity) => {
        // Clamp between 0-1
        const clampedSensitivity = Math.max(0, Math.min(1, sensitivity));
        await get().updatePreferences({ wake_word_sensitivity: clampedSensitivity });
      },

      setWakeWordCooldown: async (ms) => {
        // Clamp between 500ms-5000ms
        const clampedMs = Math.max(500, Math.min(5000, ms));
        await get().updatePreferences({ wake_word_cooldown_ms: clampedMs });
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
