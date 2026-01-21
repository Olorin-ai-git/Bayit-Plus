/**
 * Wake Word Section Component
 * Wake word detection settings and testing
 */

import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';
import { VoiceSettingRow } from './VoiceSettingRow';
import { SensitivitySelector } from './SensitivitySelector';
import { PrivacyNotice } from './PrivacyNotice';
import { WakeWordTestButton } from './WakeWordTestButton';
import { SensitivityOption } from '../types';

const WAKE_WORD_SENSITIVITIES: SensitivityOption[] = [
  { value: 0.5, labelKey: 'sensitivityLow' },
  { value: 0.7, labelKey: 'sensitivityMedium' },
  { value: 0.9, labelKey: 'sensitivityHigh' },
];

interface WakeWordSectionProps {
  wakeWordEnabled: boolean;
  wakeWordSensitivity: number;
  isRTL: boolean;
  onToggleWakeWord: () => void;
  onSensitivityChange: (sensitivity: number) => void;
}

export function WakeWordSection({
  wakeWordEnabled,
  wakeWordSensitivity,
  isRTL,
  onToggleWakeWord,
  onSensitivityChange,
}: WakeWordSectionProps) {
  const { t } = useTranslation();

  return (
    <GlassView style={styles.section}>
      <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
        <Zap size={16} color={colors.warning} />
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
          {t('profile.voice.wakeWord', '"Hi Bayit" Wake Word')}
        </Text>
      </View>

      <VoiceSettingRow
        label={t('profile.voice.wakeWordEnabled', 'Enable "Hi Bayit" wake word')}
        description={t('profile.voice.wakeWordEnabledDesc', 'Say "Hi Bayit" to activate voice commands without pressing a button')}
        value={wakeWordEnabled}
        onToggle={onToggleWakeWord}
        isRTL={isRTL}
      />

      {wakeWordEnabled && (
        <>
          <SensitivitySelector
            selectedSensitivity={wakeWordSensitivity}
            options={WAKE_WORD_SENSITIVITIES}
            isRTL={isRTL}
            onSensitivityChange={onSensitivityChange}
          />

          <PrivacyNotice isRTL={isRTL} />

          <WakeWordTestButton />
        </>
      )}
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
});
