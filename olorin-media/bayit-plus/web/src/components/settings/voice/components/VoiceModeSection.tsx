/**
 * Voice Mode Section Component
 * Voice operation mode selection and information
 */

import { View, Text, StyleSheet } from 'react-native';
import { Radio as RadioIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared/ui';
import { VoiceMode } from '@bayit/shared-types/voiceModes';
import { VoiceModeCard } from './VoiceModeCard';
import { VoiceModeOption } from '../types';

const VOICE_MODES: VoiceModeOption[] = [
  {
    value: VoiceMode.VOICE_ONLY,
    labelKey: 'voiceMode.voiceOnly',
    descKey: 'voiceMode.voiceOnlyDesc',
    icon: 'podcasts'
  },
  {
    value: VoiceMode.HYBRID,
    labelKey: 'voiceMode.hybrid',
    descKey: 'voiceMode.hybridDesc',
    icon: 'podcasts'
  },
  {
    value: VoiceMode.CLASSIC,
    labelKey: 'voiceMode.classic',
    descKey: 'voiceMode.classicDesc',
    icon: 'live'
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
    <GlassView style={styles.container}>
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <RadioIcon size={16} color="#A855F7" />
        <Text style={styles.sectionTitle}>
          {t('profile.voice.operationMode', 'Voice Operation Mode')}
        </Text>
      </View>

      <Text style={[styles.description, isRTL && styles.textRight]}>
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

      <View style={styles.infoContainer}>
        {selectedMode === VoiceMode.VOICE_ONLY && (
          <>
            <Text style={[styles.infoTitle, isRTL && styles.textRight]}>
              {t('profile.voice.voiceOnlyInfo', 'Voice Only Mode')}
            </Text>
            <Text style={[styles.infoText, isRTL && styles.textRight]}>
              {t('profile.voice.voiceOnlyDetails', 'Say "Hey Bayit" to activate. Remote control disabled. Navigate entirely with voice commands.')}
            </Text>
          </>
        )}
        {selectedMode === VoiceMode.HYBRID && (
          <>
            <Text style={[styles.infoTitle, isRTL && styles.textRight]}>
              {t('profile.voice.hybridInfo', 'Hybrid Mode')}
            </Text>
            <Text style={[styles.infoText, isRTL && styles.textRight]}>
              {t('profile.voice.hybridDetails', 'Use both voice and remote control. Get voice feedback on your button presses and interactions.')}
            </Text>
          </>
        )}
        {selectedMode === VoiceMode.CLASSIC && (
          <>
            <Text style={[styles.infoTitle, isRTL && styles.textRight]}>
              {t('profile.voice.classicInfo', 'Classic Mode')}
            </Text>
            <Text style={[styles.infoText, isRTL && styles.textRight]}>
              {t('profile.voice.classicDetails', 'Traditional remote-only experience. Voice features disabled.')}
            </Text>
          </>
        )}
      </View>
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
  description: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  modesContainer: {
    gap: 16,
  },
  infoContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A855F7',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  textRight: {
    textAlign: 'right',
  },
});
