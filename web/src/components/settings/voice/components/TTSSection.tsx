/**
 * Text-to-Speech Section Component
 * TTS settings including volume and speed controls
 */

import { View, Text, StyleSheet } from 'react-native';
import { Volume } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared/ui';
import { VoiceSettingRow } from './VoiceSettingRow';
import { VolumeControl } from './VolumeControl';
import { SpeedControl } from './SpeedControl';

interface TTSSectionProps {
  ttsEnabled: boolean;
  ttsVolume: number;
  ttsSpeed: number;
  isRTL: boolean;
  onToggleTTS: () => void;
  onVolumeChange: (volume: number) => void;
  onSpeedChange: (speed: number) => void;
}

export function TTSSection({
  ttsEnabled,
  ttsVolume,
  ttsSpeed,
  isRTL,
  onToggleTTS,
  onVolumeChange,
  onSpeedChange,
}: TTSSectionProps) {
  const { t } = useTranslation();

  return (
    <GlassView className="p-6 gap-4">
      <View className="flex-row items-center gap-2 mb-1" style={isRTL && styles.rtlRow}>
        <Volume size={16} color="#A855F7" />
        <Text className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-0">
          {t('profile.voice.textToSpeech', 'Voice Responses')}
        </Text>
      </View>

      <VoiceSettingRow
        label={t('profile.voice.ttsEnabled', 'Enable voice responses')}
        description={t('profile.voice.ttsEnabledDesc', 'App will speak responses to your voice commands')}
        value={ttsEnabled}
        onToggle={onToggleTTS}
        isRTL={isRTL}
      />

      {ttsEnabled && (
        <>
          <VolumeControl
            volume={ttsVolume}
            isRTL={isRTL}
            onVolumeChange={onVolumeChange}
          />

          <SpeedControl
            speed={ttsSpeed}
            isRTL={isRTL}
            onSpeedChange={onSpeedChange}
          />
        </>
      )}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  rtlRow: {
    flexDirection: 'row-reverse',
  },
});
