/**
 * Accessibility Section Component
 * Accessibility settings including text size and contrast
 */

import { View, Text, Pressable } from 'react-native';
import { Eye, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared/ui';
import { VoiceSettingRow } from './VoiceSettingRow';
import { TextSize } from '../types';

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

interface AccessibilitySectionProps {
  autoSubtitle: boolean;
  highContrastMode: boolean;
  textSize: TextSize;
  isRTL: boolean;
  onToggleAutoSubtitle: () => void;
  onToggleHighContrast: () => void;
  onTextSizeChange: (size: TextSize) => void;
}

export function AccessibilitySection({
  autoSubtitle,
  highContrastMode,
  textSize,
  isRTL,
  onToggleAutoSubtitle,
  onToggleHighContrast,
  onTextSizeChange,
}: AccessibilitySectionProps) {
  const { t } = useTranslation();

  return (
    <GlassView className="p-6 gap-4">
      <View className={`flex-row items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Eye size={16} color="#9CA3AF" />
        <Text className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-0">
          {t('profile.voice.accessibility', 'Accessibility')}
        </Text>
      </View>

      <VoiceSettingRow
        label={t('profile.voice.autoSubtitle', 'Auto-enable subtitles')}
        description={t('profile.voice.autoSubtitleDesc', 'Automatically show subtitles when playing content')}
        value={autoSubtitle}
        onToggle={onToggleAutoSubtitle}
        isRTL={isRTL}
      />

      <VoiceSettingRow
        label={t('profile.voice.highContrast', 'High contrast mode')}
        description={t('profile.voice.highContrastDesc', 'Increase contrast for better visibility')}
        value={highContrastMode}
        onToggle={onToggleHighContrast}
        isRTL={isRTL}
      />

      <View className="pt-2">
        <View className={`flex-row items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Type size={16} color="#9CA3AF" />
          <Text className="text-sm font-medium text-white">
            {t('profile.voice.textSize', 'Text size')}
          </Text>
        </View>
        <View className={`flex-row gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {TEXT_SIZES.map((size) => {
            const isSelected = textSize === size.value;
            return (
              <Pressable
                key={size.value}
                onPress={() => onTextSizeChange(size.value)}
                className={`flex-1 items-center justify-center py-4 rounded-xl ${
                  isSelected
                    ? 'bg-purple-900/30 border border-purple-500/40'
                    : 'bg-white/5'
                } hover:bg-white/8`}
              >
                <Text
                  className={`${isSelected ? 'text-purple-500 font-medium' : 'text-white'}`}
                  style={{
                    fontSize: size.value === 'small' ? 12 : size.value === 'medium' ? 14 : 16
                  }}
                >
                  {t(`profile.voice.textSize${size.label}`, size.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </GlassView>
  );
}
