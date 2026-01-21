/**
 * Voice Settings Types
 * Shared type definitions for voice settings components
 */

import { VoiceMode } from '@bayit/shared-types/voiceModes';
import { TextSize, VADSensitivity } from '@/stores/voiceSettingsStore';

export interface VoicePreferences {
  voice_search_enabled: boolean;
  auto_subtitle: boolean;
  high_contrast_mode: boolean;
  text_size: TextSize;
  hold_button_mode: boolean;
  silence_threshold_ms: number;
  vad_sensitivity: VADSensitivity;
  wake_word_enabled: boolean;
  wake_word: string;
  wake_word_sensitivity: number;
  wake_word_cooldown_ms: number;
  voice_mode: VoiceMode;
  tts_enabled: boolean;
  tts_volume: number;
  tts_speed: number;
  voice_feedback_enabled: boolean;
}

export interface ToggleProps {
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export interface SettingRowProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
  isRTL?: boolean;
}

export interface VoiceModeOption {
  value: VoiceMode;
  labelKey: string;
  descKey: string;
  icon: string;
}

export interface SensitivityOption {
  value: number;
  labelKey: string;
}

export { VoiceMode, TextSize, VADSensitivity };
