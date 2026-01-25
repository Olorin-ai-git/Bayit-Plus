/**
 * useVoiceSettings Hook
 * Custom hook for voice settings state management
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVoiceSettingsStore } from '@/stores/voiceSettingsStore';
import { useAuthStore } from '@/stores/authStore';

export function useVoiceSettings() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const { isAuthenticated, isHydrated } = useAuthStore();

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
    // Only load preferences if user is authenticated and store is hydrated
    if (isAuthenticated && isHydrated) {
      loadPreferences();
    }
  }, [loadPreferences, isAuthenticated, isHydrated]);

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
