/**
 * Options Section Component
 * Additional ritual options (auto-play, skip weekends)
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared/ui';
import { Toggle } from './Toggle';
import { OptionsSectionProps } from '../types';

export function OptionsSection({
  autoPlay,
  skipWeekends,
  enabled,
  onAutoPlayToggle,
  onSkipWeekendsToggle,
  isRTL,
}: OptionsSectionProps) {
  const { t } = useTranslation();

  return (
    <GlassView className="p-4 gap-4" style={!enabled && styles.disabled}>
      <Text className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide" style={isRTL && styles.textRight}>
        {t('settings.ritual.options', 'אפשרויות נוספות')}
      </Text>

      <Pressable
        onPress={() => enabled && onAutoPlayToggle()}
        className="flex-row items-center justify-between"
        style={isRTL && styles.rowReverse}
      >
        <Text className="text-[14px] text-white" style={isRTL && styles.textRight}>
          {t('settings.ritual.autoPlay')}
        </Text>
        <Toggle value={autoPlay} onToggle={onAutoPlayToggle} disabled={!enabled} />
      </Pressable>

      <Pressable
        onPress={() => enabled && onSkipWeekendsToggle()}
        className="flex-row items-center justify-between"
        style={isRTL && styles.rowReverse}
      >
        <Text className="text-[14px] text-white" style={isRTL && styles.textRight}>
          {t('settings.ritual.skipWeekends')}
        </Text>
        <Toggle value={skipWeekends} onToggle={onSkipWeekendsToggle} disabled={!enabled} />
      </Pressable>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
});
