/**
 * QueueHeader Component
 * Displays queue statistics and title
 */

import React from 'react';
import { View, Text } from 'react-native';
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
    <View className="mb-6">
      <View className={`flex-row justify-between items-start gap-6 mb-4`} style={{ flexDirection: directionFlex }}>
        <Text className="text-2xl font-bold" style={{ textAlign, color: colors.text }}>
          {t('admin.uploads.queueStatus', 'Upload Queue')}
        </Text>
        <View className={`flex-row gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <View className="items-center">
            <Text className="text-lg font-bold" style={{ color: colors.text }}>{stats.total_jobs}</Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>{t('admin.uploads.totalJobs', 'Total')}</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold" style={{ color: colors.warning }}>{stats.queued}</Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>{t('admin.uploads.queued', 'Queued')}</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold" style={{ color: colors.primary }}>{stats.processing}</Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>{t('admin.uploads.processing', 'Active')}</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold" style={{ color: colors.success }}>{stats.completed}</Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>{t('admin.uploads.completed', 'Done')}</Text>
          </View>
          {skippedCount > 0 && (
            <View className="items-center">
              <Text className="text-lg font-bold" style={{ color: colors.info }}>{skippedCount}</Text>
              <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>{t('admin.uploads.skipped', 'Skipped')}</Text>
            </View>
          )}
          {actualFailures > 0 && (
            <View className="items-center">
              <Text className="text-lg font-bold" style={{ color: colors.error }}>{actualFailures}</Text>
              <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>{t('admin.uploads.failed', 'Failed')}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
