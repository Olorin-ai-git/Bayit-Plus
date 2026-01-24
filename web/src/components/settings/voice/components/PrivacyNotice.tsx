/**
 * Privacy Notice Component
 * Privacy information for wake word detection
 */

import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PrivacyNoticeProps {
  isRTL: boolean;
}

export function PrivacyNotice({ isRTL }: PrivacyNoticeProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.container, isRTL && styles.rtlRow]}>
      <ShieldCheck size={14} color="#22C55E" />
      <Text style={[styles.text, isRTL && styles.rtlText]}>
        {t('profile.voice.wakeWordPrivacy', 'Wake word detection is processed locally on your device - no audio is sent until after "Hi Bayit" is detected')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 8,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  text: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  rtlText: {
    textAlign: 'right',
  },
});
