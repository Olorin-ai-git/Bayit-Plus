/**
 * Voice Search Section Component
 * Voice search settings
 */

import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';
import { VoiceSettingRow } from './VoiceSettingRow';

interface VoiceSearchSectionProps {
  voiceSearchEnabled: boolean;
  isRTL: boolean;
  onToggle: () => void;
}

export function VoiceSearchSection({
  voiceSearchEnabled,
  isRTL,
  onToggle,
}: VoiceSearchSectionProps) {
  const { t } = useTranslation();

  return (
    <GlassView style={styles.section}>
      <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
        {t('profile.voice.voiceSearch', 'Voice Search')}
      </Text>

      <VoiceSettingRow
        label={t('profile.voice.voiceSearchEnabled', 'Enable voice search')}
        description={t('profile.voice.voiceSearchEnabledDesc', 'Search for content using your voice')}
        value={voiceSearchEnabled}
        onToggle={onToggle}
        isRTL={isRTL}
      />
    </GlassView>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  textRTL: {
    textAlign: 'right',
  },
});
