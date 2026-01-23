/**
 * Wake Word Section Component
 * Wake word detection settings and testing
 */

import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
    <GlassView className="p-6 gap-4">
      <View style={[styles.titleRow, isRTL && styles.rowReverse]}>
        <Zap size={16} color="#F59E0B" />
        <Text className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-0">
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
