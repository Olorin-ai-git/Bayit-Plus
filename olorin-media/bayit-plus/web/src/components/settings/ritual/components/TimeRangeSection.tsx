/**
 * Time Range Section Component
 * Configure morning ritual time range
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassSelect } from '@bayit/shared/ui';
import { spacing, borderRadius, colors } from '@bayit/shared/theme';
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
    <GlassView style={[styles.container, !enabled && styles.disabled]}>
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
        {t('settings.ritual.timeRange', 'טווח זמנים')}
      </Text>

      <View style={[styles.row, isRTL && styles.rowReverse]}>
        <View style={styles.flex1}>
          <GlassSelect
            label={t('settings.ritual.startTime')}
            value={startTime}
            onChange={(value) => onStartChange(parseInt(value))}
            options={startOptions}
            disabled={!enabled}
          />
        </View>

        <View style={styles.flex1}>
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
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  flex1: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  textRight: {
    textAlign: 'right',
  },
});
