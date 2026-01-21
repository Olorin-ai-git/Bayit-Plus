/**
 * Voice Mode Section Component
 * Voice operation mode selection and information
 */

import { View, Text, StyleSheet } from 'react-native';
import { Radio as RadioIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';
import { VoiceMode } from '@bayit/shared-types/voiceModes';
import { VoiceModeCard } from './VoiceModeCard';
import { VoiceModeOption } from '../types';

const VOICE_MODES: VoiceModeOption[] = [
  {
    value: VoiceMode.VOICE_ONLY,
    labelKey: 'voiceMode.voiceOnly',
    descKey: 'voiceMode.voiceOnlyDesc',
    icon: '🎙️'
  },
  {
    value: VoiceMode.HYBRID,
    labelKey: 'voiceMode.hybrid',
    descKey: 'voiceMode.hybridDesc',
    icon: '🎙️✨'
  },
  {
    value: VoiceMode.CLASSIC,
    labelKey: 'voiceMode.classic',
    descKey: 'voiceMode.classicDesc',
    icon: '📺'
  },
];

interface VoiceModeSectionProps {
  selectedMode: VoiceMode;
  isRTL: boolean;
  onModeChange: (mode: VoiceMode) => void;
}

export function VoiceModeSection({ selectedMode, isRTL, onModeChange }: VoiceModeSectionProps) {
  const { t } = useTranslation();

  return (
    <GlassView style={styles.section}>
      <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
        <RadioIcon size={16} color={colors.primary} />
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
          {t('profile.voice.operationMode', 'Voice Operation Mode')}
        </Text>
      </View>

      <Text style={[styles.modeDescription, isRTL && styles.textRTL]}>
        {t('profile.voice.operationModeDesc', 'Choose how you interact with the app')}
      </Text>

      <View style={styles.modesContainer}>
        {VOICE_MODES.map((modeOption) => (
          <VoiceModeCard
            key={modeOption.value}
            mode={modeOption}
            isSelected={selectedMode === modeOption.value}
            isRTL={isRTL}
            onSelect={() => onModeChange(modeOption.value)}
            t={t}
          />
        ))}
      </View>

      <View style={[styles.modeInfo, isRTL && styles.modeInfoRTL]}>
        {selectedMode === VoiceMode.VOICE_ONLY && (
          <>
            <Text style={[styles.modeInfoLabel, isRTL && styles.textRTL]}>
              {t('profile.voice.voiceOnlyInfo', 'Voice Only Mode')}
            </Text>
            <Text style={[styles.modeInfoText, isRTL && styles.textRTL]}>
              {t('profile.voice.voiceOnlyDetails', 'Say "Hey Bayit" to activate. Remote control disabled. Navigate entirely with voice commands.')}
            </Text>
          </>
        )}
        {selectedMode === VoiceMode.HYBRID && (
          <>
            <Text style={[styles.modeInfoLabel, isRTL && styles.textRTL]}>
              {t('profile.voice.hybridInfo', 'Hybrid Mode')}
            </Text>
            <Text style={[styles.modeInfoText, isRTL && styles.textRTL]}>
              {t('profile.voice.hybridDetails', 'Use both voice and remote control. Get voice feedback on your button presses and interactions.')}
            </Text>
          </>
        )}
        {selectedMode === VoiceMode.CLASSIC && (
          <>
            <Text style={[styles.modeInfoLabel, isRTL && styles.textRTL]}>
              {t('profile.voice.classicInfo', 'Classic Mode')}
            </Text>
            <Text style={[styles.modeInfoText, isRTL && styles.textRTL]}>
              {t('profile.voice.classicDetails', 'Traditional remote-only experience. Voice features disabled.')}
            </Text>
          </>
        )}
      </View>
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
  modeDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  modesContainer: {
    gap: spacing.md,
  },
  textRTL: {
    textAlign: 'right',
  },
  modeInfo: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.md,
  },
  modeInfoRTL: {
    flexDirection: 'row-reverse',
  },
  modeInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  modeInfoText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
