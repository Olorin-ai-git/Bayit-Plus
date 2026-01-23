/**
 * Schedule Section Component
 * Displays EPG schedule for live channels
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
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
        <View
          key={i}
          style={[styles.scheduleCard, show.isNow && styles.scheduleItemNow]}
        >
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{show.time}</Text>
            {show.isNow && (
              <View style={styles.nowBadge}>
                <Text style={styles.nowBadgeText}>{nowLabel}</Text>
              </View>
            )}
          </View>
          <Text style={styles.showTitle}>{show.title}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scheduleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  scheduleItemNow: {
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: 'rgba(156, 163, 175, 1)',
  },
  nowBadge: {
    backgroundColor: 'rgba(239, 68, 68, 1)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  nowBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  showTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
});
