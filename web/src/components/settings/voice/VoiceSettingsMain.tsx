/**
 * Voice Settings Main Component
 * Refactored modular voice settings orchestrator
 */

import { View, ActivityIndicator } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { VoiceMode } from '@bayit/shared-types/voiceModes';
import { useVoiceSettings } from './hooks';
import {
  VoiceSettingsHeader,
  VoiceModeSection,
  TTSSection,
  HybridFeedbackSection,
  VoiceSearchSection,
  WakeWordSection,
  AccessibilitySection,
  SavingIndicator,
} from './components';

export default function VoiceSettingsMain() {
  const { preferences, loading, saving, isRTL, actions } = useVoiceSettings();

  if (loading) {
    return (
      <View className="items-center justify-center p-8">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="gap-4">
      <VoiceSettingsHeader isRTL={isRTL} />

      <VoiceModeSection
        selectedMode={preferences.voice_mode}
        isRTL={isRTL}
        onModeChange={actions.setMode}
      />

      {preferences.voice_mode !== VoiceMode.CLASSIC && (
        <TTSSection
          ttsEnabled={preferences.tts_enabled}
          ttsVolume={preferences.tts_volume ?? 1.0}
          ttsSpeed={preferences.tts_speed ?? 1.0}
          isRTL={isRTL}
          onToggleTTS={() => actions.toggleSetting('tts_enabled')}
          onVolumeChange={actions.setTTSVolume}
          onSpeedChange={actions.setTTSSpeed}
        />
      )}

      {preferences.voice_mode === VoiceMode.HYBRID && (
        <HybridFeedbackSection
          voiceFeedbackEnabled={preferences.voice_feedback_enabled}
          isRTL={isRTL}
          onToggle={() => actions.setVoiceFeedbackEnabled(!preferences.voice_feedback_enabled)}
        />
      )}

      <VoiceSearchSection
        voiceSearchEnabled={preferences.voice_search_enabled}
        isRTL={isRTL}
        onToggle={() => actions.toggleSetting('voice_search_enabled')}
      />

      <WakeWordSection
        wakeWordEnabled={preferences.wake_word_enabled}
        wakeWordSensitivity={preferences.wake_word_sensitivity}
        isRTL={isRTL}
        onToggleWakeWord={() => actions.setWakeWordEnabled(!preferences.wake_word_enabled)}
        onSensitivityChange={actions.setWakeWordSensitivity}
      />

      <AccessibilitySection
        autoSubtitle={preferences.auto_subtitle}
        highContrastMode={preferences.high_contrast_mode}
        textSize={preferences.text_size}
        isRTL={isRTL}
        onToggleAutoSubtitle={() => actions.toggleSetting('auto_subtitle')}
        onToggleHighContrast={() => actions.toggleSetting('high_contrast_mode')}
        onTextSizeChange={actions.setTextSize}
      />

      <SavingIndicator visible={saving} />
    </View>
  );
}
