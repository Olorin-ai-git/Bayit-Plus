/**
 * Privacy Notice Component
 * Privacy information for wake word detection
 */

import { View, Text } from 'react-native';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PrivacyNoticeProps {
  isRTL: boolean;
}

export function PrivacyNotice({ isRTL }: PrivacyNoticeProps) {
  const { t } = useTranslation();

  return (
    <View className={`flex-row items-center gap-2 pt-4 border-t border-white/5 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <ShieldCheck size={14} color="#22C55E" />
      <Text className={`text-xs text-gray-500 flex-1 ${isRTL ? 'text-right' : ''}`}>
        {t('profile.voice.wakeWordPrivacy', 'Wake word detection is processed locally on your device - no audio is sent until after "Hi Bayit" is detected')}
      </Text>
    </View>
  );
}
