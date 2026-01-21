/**
 * QueuedItemsList Component
 * Displays list of queued upload jobs
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
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
    <View style={styles.section}>
      <Pressable
        style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={() => setShowQueue(!showQueue)}
      >
        <Text style={[styles.sectionTitle, { textAlign, flex: 1 }]}>
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
          style={styles.jobList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {queue.length === 0 ? (
            <Text style={[styles.emptyText, { textAlign }]}>
              {t('admin.uploads.noQueuedItems', 'No items in queue')}
            </Text>
          ) : (
            queue.map((job) => (
              <View key={job.job_id} style={styles.queuedJobCard}>
                <View style={[styles.jobHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <StatusIcon status={job.status} job={job} />
                  <Text style={[styles.jobFilename, { flex: 1, textAlign }]} numberOfLines={1}>
                    {job.filename}
                  </Text>
                  <Text style={styles.jobSize}>{formatFileSize(job.file_size)}</Text>
                </View>
                <Text style={[styles.jobTime, { textAlign }]}>
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

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  queuedJobCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  jobFilename: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  jobSize: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  jobTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  jobList: {
    maxHeight: 600,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
