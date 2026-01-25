/**
 * QueuedItemsList Component
 * Displays list of queued upload jobs
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Inbox, Upload } from 'lucide-react';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { QueueJob } from '../types';
import { formatFileSize } from '../utils';
import { StatusIcon } from './StatusIcon';
import { EmptyState } from '@/pages/admin/UploadsPage/components/EmptyState';
import { format } from 'date-fns';

interface QueuedItemsListProps {
  queue?: QueueJob[];
  isRTL: boolean;
  textAlign: 'left' | 'right' | 'center';
}

export const QueuedItemsList: React.FC<QueuedItemsListProps> = ({ queue = [], isRTL, textAlign }) => {
  const { t } = useTranslation();
  const [showQueue, setShowQueue] = useState(true);

  const queueItems = queue || [];

  return (
    <View style={[styles.container, { borderTopColor: colors.glassBorder }]}>
      <Pressable
        style={[styles.headerRow, isRTL && styles.rowReverse]}
        onPress={() => setShowQueue(!showQueue)}
      >
        <Text style={[styles.headerText, { textAlign, color: colors.text }]}>
          {t('admin.uploads.queuedItems', 'Queued')} ({queueItems.length})
        </Text>
        {showQueue ? (
          <ChevronUp size={20} color={colors.textMuted} />
        ) : (
          <ChevronDown size={20} color={colors.textMuted} />
        )}
      </Pressable>

      {showQueue && (
        <ScrollView
          style={styles.scrollView}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {queueItems.length === 0 ? (
            <EmptyState
              icon={Inbox}
              iconColor="rgba(59, 130, 246, 0.4)"
              title={t('admin.uploads.queueDashboard.noQueuedJobs')}
              description={t('admin.uploads.queueDashboard.noQueuedJobsDescription')}
            />
          ) : (
            queueItems.map((job) => (
              <View key={job.job_id} style={[styles.jobCard, { backgroundColor: colors.backgroundLight, borderColor: colors.glassBorder }]}>
                <View style={[styles.jobRow, isRTL && styles.rowReverse]}>
                  <StatusIcon status={job.status} job={job} />
                  <Text style={[styles.filename, { textAlign, color: colors.text }]} numberOfLines={1}>
                    {job.filename}
                  </Text>
                  <Text style={[styles.fileSize, { color: colors.textMuted }]}>{formatFileSize(job.file_size)}</Text>
                </View>
                <Text style={[styles.timestamp, { textAlign, color: colors.textMuted }]}>
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
  container: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    maxHeight: 600,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  jobCard: {
    borderRadius: 4,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  filename: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
