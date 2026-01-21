/**
 * Voice Settings Header Component
 * Header section for voice settings page
 */

import { View, Text, StyleSheet } from 'react-native';
import { Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

interface VoiceSettingsHeaderProps {
  isRTL: boolean;
}

export function VoiceSettingsHeader({ isRTL }: VoiceSettingsHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.header, isRTL && styles.headerRTL]}>
      <View style={styles.headerIcon}>
        <Mic size={24} color="#06B6D4" />
      </View>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
          {t('profile.voice.title', 'Voice & Accessibility')}
        </Text>
        <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
          {t('profile.voice.description', 'Configure voice and accessibility features')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  textRTL: {
    textAlign: 'right',
  },
});
