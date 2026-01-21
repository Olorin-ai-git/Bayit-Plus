/**
 * TriggerConfigPanel Component
 * Configuration panel for flow triggers (time, shabbat, holiday)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, Flame, Calendar, MapPin } from 'lucide-react';
import { GlassView, GlassSelect, GlassInput, GlassCheckbox } from '@bayit/shared/ui';
import { DaySelector } from '../../../../../shared/components/flows';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { calculateShabbatTrigger, formatTriggerDisplay } from '../utils/shabbatCalculator';
import type { FlowTrigger, DayOfWeek, TriggerType } from '../types/flows.types';

interface TriggerConfigPanelProps {
  trigger: FlowTrigger;
  onChange: (trigger: FlowTrigger) => void;
  disabled?: boolean;
  isRTL?: boolean;
}

const TRIGGER_TYPE_ICONS: Record<TriggerType, React.ReactNode> = {
  time: <Clock size={16} color={colors.primary} />,
  shabbat: <Flame size={16} color={colors.secondary} />,
  holiday: <Calendar size={16} color={colors.warning} />,
};

export const TriggerConfigPanel: React.FC<TriggerConfigPanelProps> = ({
  trigger,
  onChange,
  disabled = false,
  isRTL = false,
}) => {
  const { t } = useTranslation();
  const [shabbatDisplay, setShabbatDisplay] = useState('');

  // Calculate Shabbat time when offset changes
  useEffect(() => {
    if (trigger.type === 'shabbat') {
      const result = calculateShabbatTrigger(trigger.candle_lighting_offset || 30);
      setShabbatDisplay(result.displayString);
    }
  }, [trigger.type, trigger.candle_lighting_offset]);

  const triggerTypeOptions = [
    { value: 'time', label: t('flows.trigger.time') },
    { value: 'shabbat', label: t('flows.trigger.shabbat') },
    { value: 'holiday', label: t('flows.trigger.holiday') },
  ];

  const handleTypeChange = (type: string) => {
    const newTrigger: FlowTrigger = {
      ...trigger,
      type: type as TriggerType,
    };

    // Set defaults based on type
    if (type === 'time') {
      newTrigger.start_time = trigger.start_time || '08:00';
      newTrigger.end_time = trigger.end_time || '10:00';
      newTrigger.days = trigger.days || [0, 1, 2, 3, 4, 5, 6];
    } else if (type === 'shabbat') {
      newTrigger.candle_lighting_offset = trigger.candle_lighting_offset || 30;
    }

    onChange(newTrigger);
  };

  const handleStartTimeChange = (time: string) => {
    onChange({ ...trigger, start_time: time });
  };

  const handleEndTimeChange = (time: string) => {
    onChange({ ...trigger, end_time: time });
  };

  const handleDaysChange = (days: DayOfWeek[]) => {
    onChange({ ...trigger, days });
  };

  const handleSkipShabbatChange = (skip: boolean) => {
    onChange({ ...trigger, skip_shabbat: skip });
  };

  const handleOffsetChange = (value: string) => {
    const offset = parseInt(value, 10);
    if (!isNaN(offset) && offset >= 0 && offset <= 120) {
      onChange({ ...trigger, candle_lighting_offset: offset });
    }
  };

  return (
    <GlassView style={styles.container} intensity="low">
      {/* Trigger Type Selector */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          {TRIGGER_TYPE_ICONS[trigger.type]}
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t('flows.trigger.type')}
          </Text>
        </View>
        <GlassSelect
          options={triggerTypeOptions}
          value={trigger.type}
          onChange={handleTypeChange}
          disabled={disabled}
        />
      </View>

      {/* Time-based Configuration */}
      {trigger.type === 'time' && (
        <>
          {/* Time Range */}
          <View style={styles.section}>
            <View style={[styles.timeRow, isRTL && styles.timeRowRTL]}>
              <View style={styles.timeField}>
                <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>
                  {t('flows.startTime')}
                </Text>
                <GlassInput
                  value={trigger.start_time || ''}
                  onChangeText={handleStartTimeChange}
                  placeholder="08:00"
                  // @ts-ignore - HTML5 time input
                  {...(Platform.OS === 'web' && { type: 'time' })}
                  disabled={disabled}
                />
              </View>
              <View style={styles.timeSeparator}>
                <Text style={styles.separatorText}>-</Text>
              </View>
              <View style={styles.timeField}>
                <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>
                  {t('flows.endTime')}
                </Text>
                <GlassInput
                  value={trigger.end_time || ''}
                  onChangeText={handleEndTimeChange}
                  placeholder="10:00"
                  // @ts-ignore - HTML5 time input
                  {...(Platform.OS === 'web' && { type: 'time' })}
                  disabled={disabled}
                />
              </View>
            </View>
          </View>

          {/* Day Selector */}
          <View style={styles.section}>
            <DaySelector
              selectedDays={trigger.days || []}
              onChange={handleDaysChange}
              disabled={disabled}
              isRTL={isRTL}
            />
          </View>

          {/* Skip Shabbat */}
          <View style={styles.section}>
            <View style={[styles.checkboxRow, isRTL && styles.checkboxRowRTL]}>
              <GlassCheckbox
                checked={trigger.skip_shabbat || false}
                onChange={handleSkipShabbatChange}
                disabled={disabled}
              />
              <View style={styles.checkboxContent}>
                <Text style={[styles.checkboxLabel, isRTL && styles.textRTL]}>
                  {t('flows.trigger.skipShabbat')}
                </Text>
                <Text style={[styles.checkboxDesc, isRTL && styles.textRTL]}>
                  {t('flows.trigger.skipShabbatDesc')}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Shabbat-based Configuration */}
      {trigger.type === 'shabbat' && (
        <>
          {/* Offset Input */}
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>
              {t('flows.trigger.shabbatOffset')}
            </Text>
            <GlassInput
              value={String(trigger.candle_lighting_offset || 30)}
              onChangeText={handleOffsetChange}
              placeholder="30"
              keyboardType="numeric"
              disabled={disabled}
            />
            <Text style={[styles.fieldHint, isRTL && styles.textRTL]}>
              {t('flows.trigger.shabbatOffsetDesc')}
            </Text>
          </View>

          {/* Calculated Time Display */}
          {shabbatDisplay && (
            <View style={styles.calculatedTime}>
              <Clock size={14} color={colors.success} />
              <Text style={styles.calculatedLabel}>
                {t('flows.trigger.calculatedTime')}:
              </Text>
              <Text style={styles.calculatedValue}>{shabbatDisplay}</Text>
            </View>
          )}

          {/* Location Note */}
          <View style={[styles.locationNote, isRTL && styles.locationNoteRTL]}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={[styles.locationText, isRTL && styles.textRTL]}>
              {t('flows.trigger.locationBased')}
            </Text>
          </View>
        </>
      )}

      {/* Holiday-based Configuration */}
      {trigger.type === 'holiday' && (
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>
            {t('flows.trigger.comingSoon')}
          </Text>
        </View>
      )}
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    width: '100%' as any,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  timeRowRTL: {
    flexDirection: 'row-reverse',
  },
  timeField: {
    flex: 1,
  },
  timeSeparator: {
    paddingBottom: spacing.md,
  },
  separatorText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkboxRowRTL: {
    flexDirection: 'row-reverse',
  },
  checkboxContent: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flexWrap: 'wrap' as any,
  },
  checkboxDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
    flexWrap: 'wrap' as any,
  },
  calculatedTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  calculatedLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  calculatedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  locationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationNoteRTL: {
    flexDirection: 'row-reverse',
  },
  locationText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  comingSoon: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});

export default TriggerConfigPanel;
