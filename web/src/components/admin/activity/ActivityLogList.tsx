import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { colors } from '@bayit/shared/theme';
import { platformClass } from '../../../utils/platformClass';
import { LibrarianAction } from '@/services/librarianService';
import ActivityLogItem from './ActivityLogItem';

// Zod schema for props validation
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

/**
 * ActivityLogList - Virtualized list of activity entries with pagination
 *
 * Displays activity log entries with pagination controls.
 * Handles loading states and empty states.
 * Fully styled with TailwindCSS via platformClass utility.
 */
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

  // Loading state
  if (loading) {
    return (
      <View className={platformClass('p-12 justify-center items-center')}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Empty state
  if (actions.length === 0) {
    return (
      <View className={platformClass('p-12 justify-center items-center')}>
        <Text className={platformClass('text-base')} style={{ textAlign, color: colors.textMuted }}>
          {t('admin.librarian.activityLog.emptyMessage')}
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Activity list */}
      <ScrollView className={platformClass('flex-1 max-h-[500px]')} showsVerticalScrollIndicator={false}>
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

      {/* Pagination controls */}
      {totalPages > 1 && (
        <View className={platformClass('mt-6 justify-center items-center gap-6')}>
          <View className={platformClass('flex-row items-center gap-6')}>
            {/* Previous page button */}
            <Pressable
              className={platformClass('p-2 rounded-sm')}
              style={{
                backgroundColor: colors.glass,
                opacity: page === 1 ? 0.4 : 1,
              }}
              onPress={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              {isRTL ? (
                <ChevronRight size={20} color={page === 1 ? colors.textMuted : colors.text} />
              ) : (
                <ChevronLeft size={20} color={page === 1 ? colors.textMuted : colors.text} />
              )}
            </Pressable>

            {/* Page indicator */}
            <Text className={platformClass('text-sm')} style={{ color: colors.text }}>
              {t('admin.librarian.activityLog.pagination', 'Page {{page}} of {{totalPages}}', {
                page,
                totalPages,
              })}
            </Text>

            {/* Next page button */}
            <Pressable
              className={platformClass('p-2 rounded-sm')}
              style={{
                backgroundColor: colors.glass,
                opacity: page === totalPages ? 0.4 : 1,
              }}
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

// Validate props at runtime in development
if (process.env.NODE_ENV === 'development') {
  const originalComponent = ActivityLogList;
  (ActivityLogList as any) = (props: any) => {
    ActivityLogListPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default ActivityLogList;
