/**
 * Hybrid Feedback Section Component
 * Settings for voice feedback in hybrid mode
 */

import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
    <GlassView style={styles.container}>
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <Zap size={16} color="#F59E0B" />
        <Text style={styles.sectionTitle}>
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

      <Text style={[styles.exampleText, isRTL && styles.textRight]}>
        {t('profile.voice.feedbackExample', 'Example: Click a movie → App says "Playing [Movie Name]"')}
      </Text>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 0,
  },
  exampleText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 16,
  },
  textRight: {
    textAlign: 'right',
  },
});
