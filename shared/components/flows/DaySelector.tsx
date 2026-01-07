/**
 * DaySelector Component
 * Multi-checkbox day selector for flow triggers
 * Compatible with Web, TV, and tvOS platforms
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
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
    <GlassView style={styles.container} intensity="low">
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.title, isRTL && styles.textRTL]}>
          {t('flows.days.title')}
        </Text>
        <View style={[styles.actions, isRTL && styles.actionsRTL]}>
          <Pressable
            onPress={selectAll}
            disabled={disabled || selectedDays.length === 7}
            style={({ pressed }) => [
              styles.actionButton,
              (disabled || selectedDays.length === 7) && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Text style={[
              styles.actionText,
              (disabled || selectedDays.length === 7) && styles.actionTextDisabled,
            ]}>
              {t('flows.days.selectAll')}
            </Text>
          </Pressable>
          <Text style={styles.actionSeparator}>|</Text>
          <Pressable
            onPress={deselectAll}
            disabled={disabled || selectedDays.length === 0}
            style={({ pressed }) => [
              styles.actionButton,
              (disabled || selectedDays.length === 0) && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Text style={[
              styles.actionText,
              (disabled || selectedDays.length === 0) && styles.actionTextDisabled,
            ]}>
              {t('flows.days.deselectAll')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Day Checkboxes */}
      <View style={[styles.daysContainer, isRTL && styles.daysContainerRTL]}>
        {ALL_DAYS.map((day) => (
          <Pressable
            key={day}
            onPress={() => toggleDay(day)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.dayItem,
              compact && styles.dayItemCompact,
              selectedDays.includes(day) && styles.dayItemSelected,
              disabled && styles.dayItemDisabled,
              pressed && styles.dayItemPressed,
            ]}
          >
            <GlassCheckbox
              checked={selectedDays.includes(day)}
              onChange={() => toggleDay(day)}
              disabled={disabled}
            />
            <Text style={[
              styles.dayLabel,
              compact && styles.dayLabelCompact,
              selectedDays.includes(day) && styles.dayLabelSelected,
              disabled && styles.dayLabelDisabled,
            ]}>
              {getDayLabel(day)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Selected Count */}
      <Text style={[styles.countText, isRTL && styles.textRTL]}>
        {selectedDays.length === 7
          ? t('flows.days.everyday')
          : selectedDays.length === 0
          ? t('flows.days.noneSelected')
          : t('flows.days.selectedCount', { count: selectedDays.length })}
      </Text>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  actionTextDisabled: {
    color: colors.textMuted,
  },
  actionSeparator: {
    fontSize: 12,
    color: colors.textMuted,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    width: '100%' as any,
  },
  daysContainerRTL: {
    // Keep row direction - days order is already correct for RTL
    flexDirection: 'row',
  },
  dayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 80,
    // @ts-ignore - Web transition
    ...(Platform.OS === 'web' && { transition: 'all 0.2s ease' }),
  },
  dayItemCompact: {
    minWidth: 60,
    paddingHorizontal: spacing.sm,
  },
  dayItemSelected: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderColor: colors.primary,
  },
  dayItemDisabled: {
    opacity: 0.5,
  },
  dayItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  dayLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dayLabelCompact: {
    fontSize: 12,
  },
  dayLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  dayLabelDisabled: {
    color: colors.textMuted,
  },
  countText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default DaySelector;
