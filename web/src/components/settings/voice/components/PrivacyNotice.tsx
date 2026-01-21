/**
 * Privacy Notice Component
 * Privacy information for wake word detection
 */

import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@bayit/shared/theme';

interface PrivacyNoticeProps {
  isRTL: boolean;
}

export function PrivacyNotice({ isRTL }: PrivacyNoticeProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.privacyNotice, isRTL && styles.privacyNoticeRTL]}>
      <ShieldCheck size={14} color={colors.success} />
      <Text style={[styles.privacyText, isRTL && styles.textRTL]}>
        {t('profile.voice.wakeWordPrivacy', 'Wake word detection is processed locally on your device - no audio is sent until after "Hi Bayit" is detected')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.sm,
  },
  privacyNoticeRTL: {
    flexDirection: 'row-reverse',
  },
  privacyText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  textRTL: {
    textAlign: 'right',
  },
});
