/**
 * Time Range Section Component
 * Configure morning ritual time range
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassSelect } from '@bayit/shared/ui';
import { TimeRangeSectionProps } from '../types';

export function TimeRangeSection({
  startTime,
  endTime,
  enabled,
  onStartChange,
  onEndChange,
  isRTL,
}: TimeRangeSectionProps) {
  const { t } = useTranslation();

  const startOptions = [5, 6, 7, 8, 9, 10, 11, 12].map((hour) => ({
    value: hour.toString(),
    label: `${hour}:00`,
  }));

  const endOptions = [6, 7, 8, 9, 10, 11, 12, 13, 14].map((hour) => ({
    value: hour.toString(),
    label: `${hour}:00`,
  }));

  return (
    <GlassView className="p-4 gap-4" style={!enabled && styles.disabled}>
      <Text className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide" style={isRTL && styles.textRight}>
        {t('settings.ritual.timeRange', 'טווח זמנים')}
      </Text>

      <View className="flex-row gap-4" style={isRTL && styles.rowReverse}>
        <View className="flex-1">
          <GlassSelect
            label={t('settings.ritual.startTime')}
            value={startTime}
            onChange={(value) => onStartChange(parseInt(value))}
            options={startOptions}
            disabled={!enabled}
          />
        </View>

        <View className="flex-1">
          <GlassSelect
            label={t('settings.ritual.endTime')}
            value={endTime}
            onChange={(value) => onEndChange(parseInt(value))}
            options={endOptions}
            disabled={!enabled}
          />
        </View>
      </View>
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
