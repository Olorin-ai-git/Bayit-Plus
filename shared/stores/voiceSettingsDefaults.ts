/**
 * Voice Settings Defaults
 * Default voice preferences and store interface definition
 * Extracted from voiceSettingsStore to keep files under 200 lines
 */

import { VoicePreferences, VoiceLanguage, TextSize, VADSensitivity } from '../services/api';
import { VoiceMode, ModeConfig } from '../types/voiceModes';
import { supportConfig } from '../config/supportConfig';

export type { VoicePreferences, VoiceLanguage, TextSize, VADSensitivity };
export { VoiceMode };

export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  voice_search_enabled: true,
  auto_subtitle: false,
  high_contrast_mode: false,
  text_size: 'medium',
  hold_button_mode: false,
  silence_threshold_ms: 2000,
  vad_sensitivity: 'low',
  wake_word_enabled: true,
  wake_word: 'hey buyit',
  wake_word_sensitivity: 0.7,
  wake_word_cooldown_ms: 2000,
  voice_mode: VoiceMode.VOICE_ONLY,
  voice_feedback_enabled: true,
  tts_enabled: true,
  tts_voice_id: supportConfig.voiceAssistant.supportVoice.voiceId,
  tts_speed: 1.0,
  tts_volume: 1.0,
};

export interface VoiceSettingsStore {
  preferences: VoicePreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;
  modeConfig: ModeConfig;
  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<VoicePreferences>) => Promise<void>;
  toggleSetting: (key: keyof Pick<VoicePreferences,
    'voice_search_enabled' | 'auto_subtitle' | 'high_contrast_mode' |
    'hold_button_mode' | 'wake_word_enabled' | 'tts_enabled'
  >) => Promise<void>;
  setTextSize: (size: TextSize) => Promise<void>;
  setVADSensitivity: (sensitivity: VADSensitivity) => Promise<void>;
  setSilenceThreshold: (ms: number) => Promise<void>;
  setWakeWordEnabled: (enabled: boolean) => Promise<void>;
  setWakeWordSensitivity: (sensitivity: number) => Promise<void>;
  setWakeWordCooldown: (ms: number) => Promise<void>;
  setMode: (mode: VoiceMode) => Promise<void>;
  setVoiceFeedbackEnabled: (enabled: boolean) => Promise<void>;
  setTTSVolume: (volume: number) => Promise<void>;
  setTTSSpeed: (speed: number) => Promise<void>;
  setTTSVoiceId: (voiceId: string) => Promise<void>;
  resetToDefaults: () => void;
  clearError: () => void;
}
