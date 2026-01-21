/**
 * QueuedItemsList Component
 * Displays list of queued upload jobs
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
import { QueueJob } from '../types';
import { formatFileSize } from '../utils';
import { StatusIcon } from './StatusIcon';
import { format } from 'date-fns';

interface QueuedItemsListProps {
  queue: QueueJob[];
  isRTL: boolean;
  textAlign: 'left' | 'right' | 'center';
}

export const QueuedItemsList: React.FC<QueuedItemsListProps> = ({ queue, isRTL, textAlign }) => {
  const { t } = useTranslation();
  const [showQueue, setShowQueue] = useState(true);

  return (
    <View className="mb-6 pt-4 border-t" style={{ borderTopColor: colors.glassBorder }}>
      <Pressable
        className={`flex-row justify-between items-center mb-4 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        onPress={() => setShowQueue(!showQueue)}
      >
        <Text className="flex-1 text-lg font-semibold" style={{ textAlign, color: colors.text }}>
          {t('admin.uploads.queuedItems', 'Queued')} ({queue.length})
        </Text>
        {showQueue ? (
          <ChevronUp size={20} color={colors.textMuted} />
        ) : (
          <ChevronDown size={20} color={colors.textMuted} />
        )}
      </Pressable>

      {showQueue && (
        <ScrollView
          className="max-h-[600px]"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {queue.length === 0 ? (
            <Text className="text-sm text-center py-6" style={{ textAlign, color: colors.textMuted }}>
              {t('admin.uploads.noQueuedItems', 'No items in queue')}
            </Text>
          ) : (
            queue.map((job) => (
              <View key={job.job_id} className="rounded-sm p-4 mb-2 border" style={{ backgroundColor: colors.backgroundLight, borderColor: colors.glassBorder }}>
                <View className={`flex-row items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <StatusIcon status={job.status} job={job} />
                  <Text className="flex-1 text-base font-semibold" style={{ textAlign, color: colors.text }} numberOfLines={1}>
                    {job.filename}
                  </Text>
                  <Text className="text-sm" style={{ color: colors.textMuted }}>{formatFileSize(job.file_size)}</Text>
                </View>
                <Text className="text-xs mt-1" style={{ textAlign, color: colors.textMuted }}>
                  {t('admin.uploads.addedAt', 'Added')}: {format(new Date(job.created_at), 'MMM d, HH:mm')}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};
