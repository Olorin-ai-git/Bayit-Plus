/**
 * RecentCompletedList Component
 * Displays recently completed upload jobs
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { GlassBadge } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
import { QueueJob } from '../types';
import { isDuplicate } from '../utils';
import { StatusIcon } from './StatusIcon';
import { format } from 'date-fns';

interface RecentCompletedListProps {
  recentCompleted: QueueJob[];
  isRTL: boolean;
  textAlign: 'left' | 'right' | 'center';
  onClearCompleted?: () => void;
  clearingCompleted?: boolean;
}

export const RecentCompletedList: React.FC<RecentCompletedListProps> = ({
  recentCompleted,
  isRTL,
  textAlign,
  onClearCompleted,
  clearingCompleted = false,
}) => {
  const { t } = useTranslation();
  const [showCompleted, setShowCompleted] = useState(true);

  if (recentCompleted.length === 0) return null;

  return (
    <View className="mb-6 pt-4 border-t" style={{ borderTopColor: colors.glassBorder }}>
      <View className={`flex-row justify-between items-center mb-4 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Pressable
          className={`flex-1 flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ cursor: 'pointer' }}
          onPress={() => setShowCompleted(!showCompleted)}
        >
          <Text className="flex-1 text-lg font-semibold" style={{ textAlign, color: colors.text }}>
            {t('admin.uploads.recentCompleted', 'Recently Completed')} ({recentCompleted.length})
          </Text>
          {showCompleted ? (
            <ChevronUp size={20} color={colors.textMuted} />
          ) : (
            <ChevronDown size={20} color={colors.textMuted} />
          )}
        </Pressable>
        {onClearCompleted && showCompleted && (
          <Pressable
            className="w-7 h-7 rounded-sm items-center justify-center border"
            style={{ backgroundColor: colors.error + '15', borderColor: colors.error + '30' }}
            onPress={onClearCompleted}
            disabled={clearingCompleted}
          >
            {clearingCompleted ? (
              <ActivityIndicator size={14} color={colors.error} />
            ) : (
              <Trash2 size={14} color={colors.error} />
            )}
          </Pressable>
        )}
      </View>

      {showCompleted && (
        <ScrollView
          className="max-h-[600px]"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {recentCompleted.map((job) => {
            const isJobDuplicate = isDuplicate(job);
            const badgeVariant = job.status === 'completed'
              ? 'success'
              : isJobDuplicate
                ? 'primary'
                : 'danger';

            return (
              <View key={job.job_id} className="rounded-sm p-4 mb-2 border" style={{ backgroundColor: colors.backgroundLight, borderColor: colors.glassBorder }}>
                <View className={`flex-row items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <StatusIcon status={job.status} job={job} />
                  <Text className="flex-1 text-base font-semibold" style={{ textAlign, color: colors.text }} numberOfLines={1}>
                    {job.filename}
                  </Text>
                  <GlassBadge
                    label={isJobDuplicate ? 'Duplicate' : job.status}
                    variant={badgeVariant}
                  />
                </View>
                {job.error_message && (
                  <Text
                    className="text-sm mt-1 mb-1"
                    style={{ color: isJobDuplicate ? (colors.info || colors.primary) : colors.error }}
                    numberOfLines={2}
                  >
                    {job.error_message}
                  </Text>
                )}
                {job.completed_at && (
                  <Text className="text-xs mt-1" style={{ textAlign, color: colors.textMuted }}>
                    {format(new Date(job.completed_at), 'MMM d, HH:mm:ss')}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};
