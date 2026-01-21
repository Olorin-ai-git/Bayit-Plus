/**
 * Voice Settings Header Component
 * Header section for voice settings page
 */

import { View, Text } from 'react-native';
import { Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VoiceSettingsHeaderProps {
  isRTL: boolean;
}

export function VoiceSettingsHeader({ isRTL }: VoiceSettingsHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className={`flex-row items-center gap-4 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <View className="w-12 h-12 rounded-xl bg-cyan-500/20 justify-center items-center">
        <Mic size={24} color="#06B6D4" />
      </View>
      <View className="flex-1">
        <Text className={`text-xl font-bold text-white ${isRTL ? 'text-right' : ''}`}>
          {t('profile.voice.title', 'Voice & Accessibility')}
        </Text>
        <Text className={`text-sm text-gray-400 mt-0.5 ${isRTL ? 'text-right' : ''}`}>
          {t('profile.voice.description', 'Configure voice and accessibility features')}
        </Text>
      </View>
    </View>
  );
}
