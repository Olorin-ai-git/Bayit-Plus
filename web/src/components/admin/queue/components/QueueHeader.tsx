/**
 * QueueHeader Component
 * Displays queue statistics and title
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';
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
    <View style={styles.container}>
      <View style={[styles.headerRow, { flexDirection: directionFlex }]}>
        <Text style={[styles.title, { textAlign, color: colors.text }]}>
          {t('admin.uploads.queueStatus', 'Upload Queue')}
        </Text>
        <View style={[styles.statsRow, isRTL && styles.rowReverse]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_jobs}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('admin.uploads.totalJobs', 'Total')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.queued}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('admin.uploads.queued', 'Queued')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary.DEFAULT }]}>{stats.processing}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('admin.uploads.processing', 'Active')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('admin.uploads.completed', 'Done')}</Text>
          </View>
          {skippedCount > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.info }]}>{skippedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('admin.uploads.skipped', 'Skipped')}</Text>
            </View>
          )}
          {actualFailures > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.error }]}>{actualFailures}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('admin.uploads.failed', 'Failed')}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
