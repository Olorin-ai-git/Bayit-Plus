/**
 * Hybrid Feedback Section Component
 * Settings for voice feedback in hybrid mode
 */

import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';
import { VoiceSettingRow } from './VoiceSettingRow';

interface HybridFeedbackSectionProps {
  voiceFeedbackEnabled: boolean;
  isRTL: boolean;
  onToggle: () => void;
}

export function HybridFeedbackSection({
  voiceFeedbackEnabled,
  isRTL,
  onToggle,
}: HybridFeedbackSectionProps) {
  const { t } = useTranslation();

  return (
    <GlassView style={styles.section}>
      <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
        <Zap size={16} color={colors.warning} />
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
          {t('profile.voice.hybridFeedback', 'Interactive Feedback')}
        </Text>
      </View>

      <VoiceSettingRow
        label={t('profile.voice.voiceFeedback', 'Voice feedback on actions')}
        description={t('profile.voice.voiceFeedbackDesc', 'Get voice confirmation when you use the remote or click buttons')}
        value={voiceFeedbackEnabled}
        onToggle={onToggle}
        isRTL={isRTL}
      />

      <Text style={[styles.feedbackExample, isRTL && styles.textRTL]}>
        {t('profile.voice.feedbackExample', 'Example: Click a movie → App says "Playing [Movie Name]"')}
      </Text>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  feedbackExample: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.md,
  },
  textRTL: {
    textAlign: 'right',
  },
});
