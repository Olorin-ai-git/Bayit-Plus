/**
 * Schedule Section Component
 * Displays EPG schedule for live channels
 */

import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { ScheduleItem } from '../types';

interface ScheduleSectionProps {
  schedule: ScheduleItem[];
  sectionTitle: string;
  nowLabel: string;
}

export function ScheduleSection({
  schedule,
  sectionTitle,
  nowLabel,
}: ScheduleSectionProps) {
  if (!schedule || schedule.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      {schedule.map((show, i) => (
        <GlassCard
          key={i}
          style={[styles.scheduleItem, show.isNow && styles.scheduleItemNow]}
        >
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTime}>{show.time}</Text>
            {show.isNow && (
              <View style={styles.nowBadge}>
                <Text style={styles.nowBadgeText}>{nowLabel}</Text>
              </View>
            )}
          </View>
          <Text style={styles.scheduleTitle}>{show.title}</Text>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scheduleItem: {
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  scheduleItemNow: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  scheduleTime: {
    fontSize: 14,
    color: colors.textMuted,
  },
  nowBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  nowBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
});
