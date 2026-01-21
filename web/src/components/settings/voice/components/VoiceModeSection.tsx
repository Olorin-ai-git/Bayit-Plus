/**
 * Voice Mode Section Component
 * Voice operation mode selection and information
 */

import { View, Text } from 'react-native';
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
    <GlassView className="p-6 gap-4">
      <View className={`flex-row items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <RadioIcon size={16} color="#A855F7" />
        <Text className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-0">
          {t('profile.voice.operationMode', 'Voice Operation Mode')}
        </Text>
      </View>

      <Text className={`text-[13px] text-gray-400 mb-4 ${isRTL ? 'text-right' : ''}`}>
        {t('profile.voice.operationModeDesc', 'Choose how you interact with the app')}
      </Text>

      <View className="gap-4">
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

      <View className={`pt-4 border-t border-white/5 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {selectedMode === VoiceMode.VOICE_ONLY && (
          <>
            <Text className={`text-[13px] font-semibold text-purple-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {t('profile.voice.voiceOnlyInfo', 'Voice Only Mode')}
            </Text>
            <Text className={`text-xs text-gray-400 leading-4 ${isRTL ? 'text-right' : ''}`}>
              {t('profile.voice.voiceOnlyDetails', 'Say "Hey Bayit" to activate. Remote control disabled. Navigate entirely with voice commands.')}
            </Text>
          </>
        )}
        {selectedMode === VoiceMode.HYBRID && (
          <>
            <Text className={`text-[13px] font-semibold text-purple-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {t('profile.voice.hybridInfo', 'Hybrid Mode')}
            </Text>
            <Text className={`text-xs text-gray-400 leading-4 ${isRTL ? 'text-right' : ''}`}>
              {t('profile.voice.hybridDetails', 'Use both voice and remote control. Get voice feedback on your button presses and interactions.')}
            </Text>
          </>
        )}
        {selectedMode === VoiceMode.CLASSIC && (
          <>
            <Text className={`text-[13px] font-semibold text-purple-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {t('profile.voice.classicInfo', 'Classic Mode')}
            </Text>
            <Text className={`text-xs text-gray-400 leading-4 ${isRTL ? 'text-right' : ''}`}>
              {t('profile.voice.classicDetails', 'Traditional remote-only experience. Voice features disabled.')}
            </Text>
          </>
        )}
      </View>
    </GlassView>
  );
}
