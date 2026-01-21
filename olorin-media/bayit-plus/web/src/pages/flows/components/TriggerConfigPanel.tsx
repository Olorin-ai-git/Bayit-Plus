/**
 * TriggerConfigPanel Component
 * Configuration panel for flow triggers (time, shabbat, holiday)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, Flame, Calendar, MapPin } from 'lucide-react';
import { GlassView, GlassSelect, GlassInput, GlassCheckbox } from '@bayit/shared/ui';
import { DaySelector } from '../../../../../shared/components/flows';
import { colors } from '@bayit/shared/theme';
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
    <GlassView className="p-4 rounded-lg w-full" intensity="low">
      {/* Trigger Type Selector */}
      <View className="mb-6">
        <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 mb-2`}>
          {TRIGGER_TYPE_ICONS[trigger.type]}
          <Text className={`text-sm font-semibold text-[color:var(--text)] ${isRTL ? 'text-right' : ''}`}>
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
          <View className="mb-6">
            <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-end gap-4`}>
              <View className="flex-1">
                <Text className={`text-xs font-medium text-[color:var(--text-secondary)] mb-1 ${isRTL ? 'text-right' : ''}`}>
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
              <View className="pb-4">
                <Text className="text-lg text-[color:var(--text-muted)]">-</Text>
              </View>
              <View className="flex-1">
                <Text className={`text-xs font-medium text-[color:var(--text-secondary)] mb-1 ${isRTL ? 'text-right' : ''}`}>
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
          <View className="mb-6">
            <DaySelector
              selectedDays={trigger.days || []}
              onChange={handleDaysChange}
              disabled={disabled}
              isRTL={isRTL}
            />
          </View>

          {/* Skip Shabbat */}
          <View className="mb-6">
            <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-4 py-2`}>
              <GlassCheckbox
                checked={trigger.skip_shabbat || false}
                onChange={handleSkipShabbatChange}
                disabled={disabled}
              />
              <View className="flex-1 flex-shrink min-w-0">
                <Text className={`text-sm font-medium text-[color:var(--text)] flex-wrap ${isRTL ? 'text-right' : ''}`}>
                  {t('flows.trigger.skipShabbat')}
                </Text>
                <Text className={`text-xs text-[color:var(--text-muted)] mt-1 leading-[18px] flex-wrap ${isRTL ? 'text-right' : ''}`}>
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
          <View className="mb-6">
            <Text className={`text-xs font-medium text-[color:var(--text-secondary)] mb-1 ${isRTL ? 'text-right' : ''}`}>
              {t('flows.trigger.shabbatOffset')}
            </Text>
            <GlassInput
              value={String(trigger.candle_lighting_offset || 30)}
              onChangeText={handleOffsetChange}
              placeholder="30"
              keyboardType="numeric"
              disabled={disabled}
            />
            <Text className={`text-[11px] text-[color:var(--text-muted)] mt-1 ${isRTL ? 'text-right' : ''}`}>
              {t('flows.trigger.shabbatOffsetDesc')}
            </Text>
          </View>

          {/* Calculated Time Display */}
          {shabbatDisplay && (
            <View className="flex flex-row items-center gap-2 p-4 bg-[rgba(16,185,129,0.1)] rounded-lg mb-4">
              <Clock size={14} color={colors.success} />
              <Text className="text-[13px] text-[color:var(--text-secondary)]">
                {t('flows.trigger.calculatedTime')}:
              </Text>
              <Text className="text-sm font-semibold text-[color:var(--success)]">{shabbatDisplay}</Text>
            </View>
          )}

          {/* Location Note */}
          <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-1`}>
            <MapPin size={14} color={colors.textMuted} />
            <Text className={`text-xs text-[color:var(--text-muted)] ${isRTL ? 'text-right' : ''}`}>
              {t('flows.trigger.locationBased')}
            </Text>
          </View>
        </>
      )}

      {/* Holiday-based Configuration */}
      {trigger.type === 'holiday' && (
        <View className="py-8 items-center">
          <Text className="text-sm text-[color:var(--text-muted)] italic">
            {t('flows.trigger.comingSoon')}
          </Text>
        </View>
      )}
    </GlassView>
  );
};

export default TriggerConfigPanel;
