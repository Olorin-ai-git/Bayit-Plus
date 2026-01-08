/**
 * Voice Settings Store
 * Manages voice search, constant listening, and accessibility preferences
 * Used across TV, tvOS, and web apps for voice-controlled UI
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profilesService, VoicePreferences, VoiceLanguage, TextSize, VADSensitivity } from '../services/api';

export type { VoicePreferences, VoiceLanguage, TextSize, VADSensitivity };

const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  voice_search_enabled: true,
  constant_listening_enabled: true,  // Enabled by default per requirements
  voice_language: 'he',
  auto_subtitle: false,
  high_contrast_mode: false,
  text_size: 'medium',
  hold_button_mode: false,           // Press-and-hold fallback disabled by default
  silence_threshold_ms: 2000,        // 2 seconds of silence before sending
  vad_sensitivity: 'medium',         // Balanced VAD sensitivity
  // Wake word settings for "Hi Bayit" activation
  wake_word_enabled: true,           // Wake word detection enabled by default
  wake_word: 'hi bayit',             // Default wake phrase
  wake_word_sensitivity: 0.7,        // 0-1 sensitivity (0.7 balanced)
  wake_word_cooldown_ms: 2000,       // Cooldown between detections
};

interface VoiceSettingsStore {
  preferences: VoicePreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;

  // Actions
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
  setVoiceLanguage: (language: VoiceLanguage) => Promise<void>;
  setTextSize: (size: TextSize) => Promise<void>;
  setVADSensitivity: (sensitivity: VADSensitivity) => Promise<void>;
  setSilenceThreshold: (ms: number) => Promise<void>;
  // Wake word actions
  setWakeWordEnabled: (enabled: boolean) => Promise<void>;
  setWakeWordSensitivity: (sensitivity: number) => Promise<void>;
  setWakeWordCooldown: (ms: number) => Promise<void>;
  resetToDefaults: () => void;
  clearError: () => void;
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
          console.error('[VoiceSettingsStore] Failed to load preferences:', error);
          set({ loading: false, error: error.message || 'Failed to load preferences' });
        }
      },

      updatePreferences: async (updates) => {
        const current = get().preferences;
        const updated = { ...current, ...updates };

        // Optimistic update - UI changes immediately
        set({ preferences: updated, saving: true, error: null });

        try {
          await profilesService.updateVoicePreferences(updated);
          set({ saving: false });
        } catch (error: any) {
          // Rollback on error
          console.error('[VoiceSettingsStore] Failed to update preferences:', error);
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

      setVADSensitivity: async (sensitivity) => {
        await get().updatePreferences({ vad_sensitivity: sensitivity });
      },

      setSilenceThreshold: async (ms) => {
        // Clamp between 1-5 seconds
        const clampedMs = Math.max(1000, Math.min(5000, ms));
        await get().updatePreferences({ silence_threshold_ms: clampedMs });
      },

      // Wake word actions
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

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'bayit-voice-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);

export default useVoiceSettingsStore;
