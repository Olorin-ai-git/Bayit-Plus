/**
 * QueueHeader Component
 * Displays queue statistics and title
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@bayit/shared/theme';
import { QueueStats } from '../types';

interface QueueHeaderProps {
  stats: QueueStats;
  isRTL: boolean;
  textAlign: 'left' | 'right' | 'center';
  directionFlex: 'row' | 'row-reverse';
  skippedCount: number;
  actualFailures: number;
}

export const QueueHeader: React.FC<QueueHeaderProps> = ({
  stats,
  isRTL,
  textAlign,
  directionFlex,
  skippedCount,
  actualFailures,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <View style={[styles.headerTop, { flexDirection: directionFlex }]}>
        <Text style={[styles.title, { textAlign }]}>
          {t('admin.uploads.queueStatus', 'Upload Queue')}
        </Text>
        <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total_jobs}</Text>
            <Text style={styles.statLabel}>{t('admin.uploads.totalJobs', 'Total')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.queued}</Text>
            <Text style={styles.statLabel}>{t('admin.uploads.queued', 'Queued')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.processing}</Text>
            <Text style={styles.statLabel}>{t('admin.uploads.processing', 'Active')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.completed}</Text>
            <Text style={styles.statLabel}>{t('admin.uploads.completed', 'Done')}</Text>
          </View>
          {skippedCount > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.info }]}>{skippedCount}</Text>
              <Text style={styles.statLabel}>{t('admin.uploads.skipped', 'Skipped')}</Text>
            </View>
          )}
          {actualFailures > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.error }]}>{actualFailures}</Text>
              <Text style={styles.statLabel}>{t('admin.uploads.failed', 'Failed')}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
