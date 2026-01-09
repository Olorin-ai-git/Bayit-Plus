/**
 * Voice Settings Store
 * Manages voice search, constant listening, and accessibility preferences
 * Includes three-mode system: Voice Only, Hybrid, Classic
 * Used across TV, tvOS, and web apps for voice-controlled UI
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profilesService, VoicePreferences, VoiceLanguage, TextSize, VADSensitivity } from '../services/api';
import { VoiceMode, ModeConfig, MODE_CONFIGS } from '../types/voiceModes';

export type { VoicePreferences, VoiceLanguage, TextSize, VADSensitivity };
export { VoiceMode };

const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  voice_search_enabled: true,
  // Note: voice_language is now derived from i18n.language instead of stored
  auto_subtitle: false,
  high_contrast_mode: false,
  text_size: 'medium',
  hold_button_mode: false,           // Press-and-hold fallback disabled by default
  silence_threshold_ms: 2000,        // 2 seconds of silence before sending
  vad_sensitivity: 'medium',         // Balanced VAD sensitivity
  // Wake word activation (mutually exclusive with always-listening - we use wake word only)
  wake_word_enabled: true,           // Wake word detection ENABLED by default - listen for "Hi Bayit"
  wake_word: 'hi bayit',             // Default wake phrase
  wake_word_sensitivity: 0.7,        // 0-1 sensitivity (0.7 balanced)
  wake_word_cooldown_ms: 2000,       // Cooldown between detections
  // Three-mode system
  voice_mode: VoiceMode.VOICE_ONLY,  // Default: Voice Only mode (no remote)
  voice_feedback_enabled: true,      // Voice feedback on interactions (default for Hybrid)
  tts_enabled: true,                 // TTS enabled by default
  tts_voice_id: 'cgSgspJ2msm6clMCkdW9', // Jessica - female, young, expressive, conversational (configured in .env via VITE_ELEVENLABS_DEFAULT_VOICE_ID)
  tts_speed: 1.0,                    // Normal speech speed (0.5-2.0)
  tts_volume: 1.0,                   // Max volume (0-1)
};

interface VoiceSettingsStore {
  preferences: VoicePreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;

  // Derived state - current mode configuration based on selected mode
  modeConfig: ModeConfig;

  // Actions
  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<VoicePreferences>) => Promise<void>;
  toggleSetting: (key: keyof Pick<VoicePreferences,
    'voice_search_enabled' |
    'auto_subtitle' |
    'high_contrast_mode' |
    'hold_button_mode' |
    'wake_word_enabled' |
    'tts_enabled'
  >) => Promise<void>;
  setTextSize: (size: TextSize) => Promise<void>;
  setVADSensitivity: (sensitivity: VADSensitivity) => Promise<void>;
  setSilenceThreshold: (ms: number) => Promise<void>;
  // Wake word actions
  setWakeWordEnabled: (enabled: boolean) => Promise<void>;
  setWakeWordSensitivity: (sensitivity: number) => Promise<void>;
  setWakeWordCooldown: (ms: number) => Promise<void>;
  // Mode system actions
  setMode: (mode: VoiceMode) => Promise<void>;
  setVoiceFeedbackEnabled: (enabled: boolean) => Promise<void>;
  setTTSVolume: (volume: number) => Promise<void>;
  setTTSSpeed: (speed: number) => Promise<void>;
  setTTSVoiceId: (voiceId: string) => Promise<void>;
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

      // Derived state: Get current mode configuration
      get modeConfig(): ModeConfig {
        const currentMode = get().preferences.voice_mode || VoiceMode.VOICE_ONLY;
        return MODE_CONFIGS[currentMode];
      },

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

      // Mode system actions
      setMode: async (mode: VoiceMode) => {
        await get().updatePreferences({ voice_mode: mode });
      },

      setVoiceFeedbackEnabled: async (enabled: boolean) => {
        await get().updatePreferences({ voice_feedback_enabled: enabled });
      },

      setTTSVolume: async (volume: number) => {
        // Clamp between 0-1
        const clampedVolume = Math.max(0, Math.min(1, volume));
        await get().updatePreferences({ tts_volume: clampedVolume });
      },

      setTTSSpeed: async (speed: number) => {
        // Clamp between 0.5-2.0
        const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));
        await get().updatePreferences({ tts_speed: clampedSpeed });
      },

      setTTSVoiceId: async (voiceId: string) => {
        await get().updatePreferences({ tts_voice_id: voiceId });
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
