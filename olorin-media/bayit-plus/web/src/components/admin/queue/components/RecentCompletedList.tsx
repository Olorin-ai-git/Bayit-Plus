/**
 * RecentCompletedList Component
 * Displays recently completed upload jobs
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { GlassBadge } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
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
    <View style={[styles.container, { borderTopColor: colors.glassBorder }]}>
      <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
        <Pressable
          style={[styles.headerButton, isRTL && styles.rowReverse]}
          onPress={() => setShowCompleted(!showCompleted)}
        >
          <Text style={[styles.headerText, { textAlign, color: colors.text }]}>
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
            style={[styles.clearButton, { backgroundColor: colors.error.DEFAULT + '15', borderColor: colors.error.DEFAULT + '30' }]}
            onPress={onClearCompleted}
            disabled={clearingCompleted}
          >
            {clearingCompleted ? (
              <ActivityIndicator size={14} color={colors.error.DEFAULT} />
            ) : (
              <Trash2 size={14} color={colors.error.DEFAULT} />
            )}
          </Pressable>
        )}
      </View>

      {showCompleted && (
        <ScrollView
          style={styles.scrollView}
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
              <View key={job.job_id} style={[styles.jobCard, { backgroundColor: colors.backgroundLight, borderColor: colors.glassBorder }]}>
                <View style={[styles.jobRow, isRTL && styles.rowReverse]}>
                  <StatusIcon status={job.status} job={job} />
                  <Text style={[styles.filename, { textAlign, color: colors.text }]} numberOfLines={1}>
                    {job.filename}
                  </Text>
                  <GlassBadge
                    label={isJobDuplicate ? 'Duplicate' : job.status}
                    variant={badgeVariant}
                  />
                </View>
                {job.error_message && (
                  <Text
                    style={[
                      styles.errorMessage,
                      { color: isJobDuplicate ? (colors.info.DEFAULT || colors.primary.DEFAULT) : colors.error.DEFAULT }
                    ]}
                    numberOfLines={2}
                  >
                    {job.error_message}
                  </Text>
                )}
                {job.completed_at && (
                  <Text style={[styles.timestamp, { textAlign, color: colors.textMuted }]}>
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
  headerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollView: {
    maxHeight: 600,
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
  errorMessage: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
