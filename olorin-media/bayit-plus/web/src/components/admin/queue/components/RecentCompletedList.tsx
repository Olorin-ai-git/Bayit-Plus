/**
 * RecentCompletedList Component
 * Displays recently completed upload jobs
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
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
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          style={[styles.sectionHeaderTitle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setShowCompleted(!showCompleted)}
        >
          <Text style={[styles.sectionTitle, { textAlign, flex: 1 }]}>
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
            style={styles.clearCompletedButton}
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
          style={styles.jobList}
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
              <View key={job.job_id} style={styles.completedJobCard}>
                <View style={[styles.jobHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <StatusIcon status={job.status} job={job} />
                  <Text style={[styles.jobFilename, { flex: 1, textAlign }]} numberOfLines={1}>
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
                      isJobDuplicate ? styles.infoText : styles.errorText
                    ]}
                    numberOfLines={2}
                  >
                    {job.error_message}
                  </Text>
                )}
                {job.completed_at && (
                  <Text style={[styles.jobTime, { textAlign }]}>
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
  sectionHeaderTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    cursor: 'pointer',
  },
  clearCompletedButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  completedJobCard: {
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
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.info || colors.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  jobTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  jobList: {
    maxHeight: 600,
  },
});
