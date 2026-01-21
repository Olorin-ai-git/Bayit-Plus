/**
 * DaySelector Component
 * Multi-checkbox day selector for flow triggers
 * Compatible with Web, TV, and tvOS platforms
 */

import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCheckbox, GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../theme';

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface DaySelectorProps {
  selectedDays: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  disabled?: boolean;
  compact?: boolean;
  isRTL?: boolean;
}

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

const DAY_KEYS: Record<DayOfWeek, string> = {
  0: 'flows.days.sunday',
  1: 'flows.days.monday',
  2: 'flows.days.tuesday',
  3: 'flows.days.wednesday',
  4: 'flows.days.thursday',
  5: 'flows.days.friday',
  6: 'flows.days.saturday',
};

export const DaySelector: React.FC<DaySelectorProps> = ({
  selectedDays,
  onChange,
  disabled = false,
  compact = false,
  isRTL = false,
}) => {
  const { t } = useTranslation();

  const toggleDay = (day: DayOfWeek) => {
    if (disabled) return;
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter(d => d !== day));
    } else {
      onChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange([...ALL_DAYS]);
  };

  const deselectAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const getDayLabel = (day: DayOfWeek) => {
    return t(DAY_KEYS[day]); // Show full day name
  };

  return (
    <GlassView className="p-4 rounded-xl" intensity="low">
      {/* Header */}
      <View className={`flex-row justify-between items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Text className={`text-sm font-semibold text-white ${isRTL ? 'text-right' : ''}`}>
          {t('flows.days.title')}
        </Text>
        <View className={`flex-row items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Pressable
            onPress={selectAll}
            disabled={disabled || selectedDays.length === 7}
            className={`px-3 py-2`}
            style={({ pressed }) => ({
              opacity: (disabled || selectedDays.length === 7) ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            <Text
              className={`text-xs font-medium ${(disabled || selectedDays.length === 7) ? 'text-white/40' : 'text-purple-500'}`}
            >
              {t('flows.days.selectAll')}
            </Text>
          </Pressable>
          <Text className="text-xs text-white/50">|</Text>
          <Pressable
            onPress={deselectAll}
            disabled={disabled || selectedDays.length === 0}
            className={`px-3 py-2`}
            style={({ pressed }) => ({
              opacity: (disabled || selectedDays.length === 0) ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            <Text
              className={`text-xs font-medium ${(disabled || selectedDays.length === 0) ? 'text-white/40' : 'text-purple-500'}`}
            >
              {t('flows.days.deselectAll')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Day Checkboxes */}
      <View className={`flex-row flex-wrap gap-2 justify-center w-full ${isRTL ? '' : ''}`}>
        {ALL_DAYS.map((day) => (
          <Pressable
            key={day}
            onPress={() => toggleDay(day)}
            disabled={disabled}
            className={`flex-row items-center gap-2 ${compact ? 'px-2' : 'px-4'} ${compact ? 'py-2' : 'py-3'} rounded-lg bg-white/5 border border-white/10 ${compact ? 'min-w-[60px]' : 'min-w-[80px]'} ${selectedDays.includes(day) ? 'bg-purple-900/30 border-purple-500' : ''}`}
            style={({ pressed }) => ({
              opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
              transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
            })}
          >
            <GlassCheckbox
              checked={selectedDays.includes(day)}
              onChange={() => toggleDay(day)}
              disabled={disabled}
            />
            <Text
              className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${selectedDays.includes(day) ? 'text-purple-500 font-semibold' : 'text-white/70'} ${disabled ? 'text-white/50' : ''}`}
            >
              {getDayLabel(day)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Selected Count */}
      <Text className={`text-xs text-white/50 text-center mt-4 ${isRTL ? 'text-right' : ''}`}>
        {selectedDays.length === 7
          ? t('flows.days.everyday')
          : selectedDays.length === 0
          ? t('flows.days.noneSelected')
          : t('flows.days.selectedCount', { count: selectedDays.length })}
      </Text>
    </GlassView>
  );
};

export default DaySelector;
