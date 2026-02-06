/**
 * Voice Settings Store
 * Manages voice search, constant listening, and accessibility preferences
 * Includes three-mode system: Voice Only, Hybrid, Classic
 * Used across TV, tvOS, and web apps for voice-controlled UI
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profilesService } from '../services/api';
import { VoiceMode, MODE_CONFIGS } from '../types/voiceModes';
import { logger } from '../utils/logger';
import {
  DEFAULT_VOICE_PREFERENCES, VoiceSettingsStore,
  VoicePreferences, VoiceLanguage, TextSize, VADSensitivity,
} from './voiceSettingsDefaults';

export type { VoicePreferences, VoiceLanguage, TextSize, VADSensitivity };
export { VoiceMode };

const log = logger.scope('VoiceSettingsStore');

export const useVoiceSettingsStore = create<VoiceSettingsStore>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_VOICE_PREFERENCES,
      loading: false,
      saving: false,
      error: null,

      get modeConfig() {
        const currentMode = get().preferences.voice_mode || VoiceMode.VOICE_ONLY;
        return MODE_CONFIGS[currentMode];
      },

      loadPreferences: async () => {
        set({ loading: true, error: null });
        try {
          const data = await profilesService.getVoicePreferences();
          set({ preferences: { ...DEFAULT_VOICE_PREFERENCES, ...data }, loading: false });
        } catch (error: any) {
          if (error?.response?.status === 401 || error?.status === 401) {
            log.info('User not authenticated, using default preferences');
            set({ preferences: DEFAULT_VOICE_PREFERENCES, loading: false, error: null });
          } else {
            log.error('Failed to load preferences', error);
            set({ loading: false, error: error.message || 'Failed to load preferences' });
          }
        }
      },

      updatePreferences: async (updates) => {
        const current = get().preferences;
        const updated = { ...current, ...updates };
        set({ preferences: updated, saving: true, error: null });
        try {
          await profilesService.updateVoicePreferences(updated);
          set({ saving: false });
        } catch (error: any) {
          log.error('Failed to update preferences', error);
          set({ preferences: current, saving: false, error: error.message || 'Failed to save preferences' });
        }
      },

      toggleSetting: async (key) => {
        const current = get().preferences;
        await get().updatePreferences({ [key]: !current[key] });
      },
      setTextSize: async (size) => { await get().updatePreferences({ text_size: size }); },
      setVADSensitivity: async (sensitivity) => { await get().updatePreferences({ vad_sensitivity: sensitivity }); },
      setSilenceThreshold: async (ms) => {
        await get().updatePreferences({ silence_threshold_ms: Math.max(1000, Math.min(5000, ms)) });
      },
      setWakeWordEnabled: async (enabled) => { await get().updatePreferences({ wake_word_enabled: enabled }); },
      setWakeWordSensitivity: async (sensitivity) => {
        await get().updatePreferences({ wake_word_sensitivity: Math.max(0, Math.min(1, sensitivity)) });
      },
      setWakeWordCooldown: async (ms) => {
        await get().updatePreferences({ wake_word_cooldown_ms: Math.max(500, Math.min(5000, ms)) });
      },
      setMode: async (mode: VoiceMode) => { await get().updatePreferences({ voice_mode: mode }); },
      setVoiceFeedbackEnabled: async (enabled: boolean) => {
        await get().updatePreferences({ voice_feedback_enabled: enabled });
      },
      setTTSVolume: async (volume: number) => {
        await get().updatePreferences({ tts_volume: Math.max(0, Math.min(1, volume)) });
      },
      setTTSSpeed: async (speed: number) => {
        await get().updatePreferences({ tts_speed: Math.max(0.5, Math.min(2.0, speed)) });
      },
      setTTSVoiceId: async (voiceId: string) => { await get().updatePreferences({ tts_voice_id: voiceId }); },
      resetToDefaults: () => { set({ preferences: DEFAULT_VOICE_PREFERENCES }); },
      clearError: () => { set({ error: null }); },
    }),
    {
      name: 'bayit-voice-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ preferences: state.preferences }),
    }
  )
);

export default useVoiceSettingsStore;
