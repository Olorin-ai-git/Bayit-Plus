import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { LibrarianAction } from '@/services/librarianService';
import ActivityLogItem from './ActivityLogItem';

const ActivityLogListPropsSchema = z.object({
  actions: z.array(z.custom<LibrarianAction>()),
  loading: z.boolean(),
  page: z.number(),
  totalPages: z.number(),
  onPageChange: z.function().args(z.number()).returns(z.void()),
  actionTypeColorMap: z.record(z.string()),
  actionTypeIconMap: z.record(z.string()),
  isRTL: z.boolean(),
  textAlign: z.enum(['left', 'right']),
  idTruncateLength: z.number(),
  onRollbackClick: z.function().args(z.string()).returns(z.void()),
  onRollbackAvailable: z.boolean(),
});

export type ActivityLogListProps = z.infer<typeof ActivityLogListPropsSchema>;

const ActivityLogList: React.FC<ActivityLogListProps> = ({
  actions,
  loading,
  page,
  totalPages,
  onPageChange,
  actionTypeColorMap,
  actionTypeIconMap,
  isRTL,
  textAlign,
  idTruncateLength,
  onRollbackClick,
  onRollbackAvailable,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (actions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { textAlign }]}>
          {t('admin.librarian.activityLog.emptyMessage')}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {actions.map((action) => (
          <ActivityLogItem
            key={action.action_id}
            action={action}
            color={actionTypeColorMap[action.action_type] || colors.textMuted}
            icon={actionTypeIconMap[action.action_type]}
            isRTL={isRTL}
            textAlign={textAlign}
            idTruncateLength={idTruncateLength}
            onRollback={
              !action.rolled_back && onRollbackAvailable
                ? () => onRollbackClick(action.action_id)
                : undefined
            }
          />
        ))}
      </ScrollView>

      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <View style={styles.paginationControls}>
            <Pressable
              style={[styles.pageButton, { opacity: page === 1 ? 0.4 : 1 }]}
              onPress={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              {isRTL ? (
                <ChevronRight size={20} color={page === 1 ? colors.textMuted : colors.text} />
              ) : (
                <ChevronLeft size={20} color={page === 1 ? colors.textMuted : colors.text} />
              )}
            </Pressable>

            <Text style={styles.pageText}>
              {t('admin.librarian.activityLog.pagination', 'Page {{page}} of {{totalPages}}', {
                page,
                totalPages,
              })}
            </Text>

            <Pressable
              style={[styles.pageButton, { opacity: page === totalPages ? 0.4 : 1 }]}
              onPress={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              {isRTL ? (
                <ChevronLeft size={20} color={page === totalPages ? colors.textMuted : colors.text} />
              ) : (
                <ChevronRight size={20} color={page === totalPages ? colors.textMuted : colors.text} />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  list: {
    flex: 1,
    maxHeight: 500,
  },
  paginationContainer: {
    marginTop: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pageButton: {
    padding: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass,
  },
  pageText: {
    fontSize: 14,
    color: colors.text,
  },
});

if (process.env.NODE_ENV === 'development') {
  const originalComponent = ActivityLogList;
  (ActivityLogList as any) = (props: any) => {
    ActivityLogListPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default ActivityLogList;
