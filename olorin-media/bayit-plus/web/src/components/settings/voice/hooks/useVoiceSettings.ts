/**
 * useVoiceSettings Hook
 * Custom hook for voice settings state management
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVoiceSettingsStore } from '@/stores/voiceSettingsStore';

export function useVoiceSettings() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const {
    preferences,
    loading,
    saving,
    loadPreferences,
    toggleSetting,
    setTextSize,
    setWakeWordEnabled,
    setWakeWordSensitivity,
    setMode,
    setVoiceFeedbackEnabled,
    setTTSVolume,
    setTTSSpeed,
  } = useVoiceSettingsStore();

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    saving,
    isRTL,
    actions: {
      toggleSetting,
      setTextSize,
      setWakeWordEnabled,
      setWakeWordSensitivity,
      setMode,
      setVoiceFeedbackEnabled,
      setTTSVolume,
      setTTSSpeed,
    },
  };
}
