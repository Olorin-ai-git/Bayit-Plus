/**
 * QueueHeader Component
 * Displays queue statistics and title with clear queue action
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { colors, spacing } from '@olorin/design-tokens';
import { useGlassAlert } from '@bayit/shared/ui';
import { QueueStats } from '../types';

interface QueueHeaderProps {
  stats: QueueStats;
  isRTL: boolean;
  textAlign: 'left' | 'right' | 'center';
  directionFlex: 'row' | 'row-reverse';
  skippedCount: number;
  actualFailures: number;
  onClearQueue?: () => Promise<void>;
  clearingQueue?: boolean;
}

export const QueueHeader: React.FC<QueueHeaderProps> = ({
  stats,
  isRTL,
  textAlign,
  directionFlex,
  skippedCount,
  actualFailures,
  onClearQueue,
  clearingQueue = false,
}) => {
  const { t } = useTranslation();
  const { confirm } = useGlassAlert();

  const handleClearQueue = () => {
    if (!onClearQueue || clearingQueue || stats.queued === 0) return;

    confirm(
      t('admin.uploads.clearQueue.title', 'Clear Upload Queue?'),
      t('admin.uploads.clearQueue.message', `This will cancel all ${stats.queued} queued uploads. This action cannot be undone.`),
      async () => {
        try {
          await onClearQueue();
        } catch (err) {
          // Error handling is done in the hook
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { flexDirection: directionFlex }]}>
        <View style={[styles.titleRow, isRTL && styles.rowReverse]}>
          <Text style={[styles.title, { textAlign, color: '#ffffff' }]}>
            {t('admin.uploads.queueStatus', 'Upload Queue')}
          </Text>
          {onClearQueue && stats.queued > 0 && (
            <Pressable
              onPress={handleClearQueue}
              style={[styles.clearButton, { backgroundColor: colors.error.DEFAULT + '15' }]}
              disabled={clearingQueue}
            >
              {clearingQueue ? (
                <GlassLoadingSpinner size="small" />
              ) : (
                <Trash2 size={16} color={colors.error.DEFAULT} />
              )}
              <Text style={[styles.clearButtonText, { color: colors.error.DEFAULT }]}>
                {t('admin.uploads.clearQueue.button', 'Clear Queue')}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={[styles.statsRow, isRTL && styles.rowReverse]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#ffffff' }]}>{stats.total_jobs}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.75)' }]}>{t('admin.uploads.totalJobs', 'Total')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning.DEFAULT }]}>{stats.queued}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.75)' }]}>{t('admin.uploads.queued', 'Queued')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary.DEFAULT }]}>{stats.processing}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.75)' }]}>{t('admin.uploads.processing', 'Active')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success.DEFAULT }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.75)' }]}>{t('admin.uploads.completed', 'Done')}</Text>
          </View>
          {skippedCount > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.info.DEFAULT }]}>{skippedCount}</Text>
              <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.75)' }]}>{t('admin.uploads.skipped', 'Skipped')}</Text>
            </View>
          )}
          {actualFailures > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.error.DEFAULT }]}>{actualFailures}</Text>
              <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.75)' }]}>{t('admin.uploads.failed', 'Failed')}</Text>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
