import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Image,
  FileText,
  Tag,
  Link as LinkIcon,
  Type,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { GlassView, GlassCard, GlassBadge, GlassButton, GlassSelect, GlassModal } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import { LibrarianAction, LibrarianConfig } from '@/services/librarianService';
import { format } from 'date-fns';

interface LibrarianActivityLogProps {
  actions: LibrarianAction[];
  loading?: boolean;
  onRollback?: (actionId: string) => Promise<void>;
  config: LibrarianConfig;
}

const LibrarianActivityLog: React.FC<LibrarianActivityLogProps> = ({
  actions,
  loading = false,
  onRollback,
  config,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [rollbackModalVisible, setRollbackModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  // Build action type color and icon maps from config
  const actionTypeColorMap: Record<string, string> = {};
  const actionTypeIconMap: Record<string, React.ReactNode> = {};

  const iconComponentMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
    Image,
    FileText,
    Tag,
    Link: LinkIcon,
    Type,
  };

  config.action_types.forEach((actionType) => {
    actionTypeColorMap[actionType.value] = getColorValue(actionType.color);
    const IconComponent = iconComponentMap[actionType.icon];
    if (IconComponent) {
      actionTypeIconMap[actionType.value] = <IconComponent size={16} color={colors.background} />;
    }
  });

  // Helper to get color value from color name
  function getColorValue(colorName: string): string {
    const colorMap: Record<string, string> = {
      success: colors.success,
      primary: colors.primary,
      warning: colors.warning,
      secondary: colors.secondary,
      info: '#3B82F6',
      error: colors.error,
    };
    return colorMap[colorName] || colors.textMuted;
  }

  const filteredActions = filter === 'all'
    ? actions
    : actions.filter(action => action.action_type === filter);

  const paginatedActions = filteredActions.slice(
    (page - 1) * config.pagination.activity_page_size,
    page * config.pagination.activity_page_size
  );

  const totalPages = Math.ceil(filteredActions.length / config.pagination.activity_page_size);

  const handleRollbackClick = (actionId: string) => {
    setSelectedAction(actionId);
    setRollbackModalVisible(true);
  };

  const handleConfirmRollback = async () => {
    if (!selectedAction || !onRollback) return;

    setRollingBack(true);
    try {
      await onRollback(selectedAction);
      setRollbackModalVisible(false);
      setSelectedAction(null);
    } catch (error) {
      // Error handled by parent
    } finally {
      setRollingBack(false);
    }
  };

  // Build filter options from config
  const filterOptions = [
    { label: t('admin.librarian.activityLog.allActions'), value: 'all' },
    ...config.action_types.map((actionType) => ({
      label: actionType.label,
      value: actionType.value,
    })),
  ];

  return (
    <GlassCard style={styles.container}>
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.title, { textAlign }]}>{t('admin.librarian.activityLog.title')}</Text>
        <View style={styles.filterContainer}>
          <GlassSelect
            options={filterOptions}
            value={filter}
            onChange={setFilter}
            placeholder={t('admin.librarian.activityLog.filterByType')}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : paginatedActions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { textAlign }]}>{t('admin.librarian.activityLog.emptyMessage')}</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.activityList} showsVerticalScrollIndicator={false}>
            {paginatedActions.map((action) => (
              <ActivityItem
                key={action.action_id}
                action={action}
                color={actionTypeColorMap[action.action_type] || colors.textMuted}
                icon={actionTypeIconMap[action.action_type]}
                isRTL={isRTL}
                textAlign={textAlign}
                idTruncateLength={config.ui.id_truncate_length}
                onRollback={
                  !action.rolled_back && onRollback
                    ? () => handleRollbackClick(action.action_id)
                    : undefined
                }
              />
            ))}
          </ScrollView>

          {totalPages > 1 && (
            <View style={[styles.pagination, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                onPress={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {isRTL ? (
                  <ChevronRight size={20} color={page === 1 ? colors.textMuted : colors.text} />
                ) : (
                  <ChevronLeft size={20} color={page === 1 ? colors.textMuted : colors.text} />
                )}
              </Pressable>

              <Text style={styles.pageText}>
                Page {page} of {totalPages}
              </Text>

              <Pressable
                style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                {isRTL ? (
                  <ChevronLeft size={20} color={page === totalPages ? colors.textMuted : colors.text} />
                ) : (
                  <ChevronRight size={20} color={page === totalPages ? colors.textMuted : colors.text} />
                )}
              </Pressable>
            </View>
          )}
        </>
      )}

      <GlassModal
        visible={rollbackModalVisible}
        type="confirm"
        title={t('admin.librarian.activityLog.confirmRollback.title')}
        message={t('admin.librarian.activityLog.confirmRollback.message')}
        buttons={[
          {
            text: t('admin.librarian.modal.cancel'),
            onPress: () => setRollbackModalVisible(false),
            variant: 'secondary',
          },
          {
            text: t('admin.librarian.activityLog.rollback'),
            onPress: handleConfirmRollback,
            variant: 'danger',
            disabled: rollingBack,
          },
        ]}
        dismissable={!rollingBack}
      />
    </GlassCard>
  );
};

interface ActivityItemProps {
  action: LibrarianAction;
  color: string;
  icon?: React.ReactNode;
  isRTL: boolean;
  textAlign: 'left' | 'right';
  idTruncateLength: number;
  onRollback?: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  action,
  color,
  icon,
  isRTL,
  textAlign,
  idTruncateLength,
  onRollback,
}) => {
  const { t } = useTranslation();
  const formattedDate = format(new Date(action.timestamp), 'MMM d, yyyy HH:mm');

  return (
    <View style={[styles.activityItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.iconWrapper, { backgroundColor: color }]}>
        {icon}
      </View>

      <View style={[styles.activityContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.activityHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <GlassBadge text={action.action_type.replace('_', ' ')} variant="default" />
          <Text style={styles.timestamp}>{formattedDate}</Text>
        </View>

        {action.description && (
          <Text style={[styles.description, { textAlign }]}>{action.description}</Text>
        )}

        <Text style={[styles.contentId, { textAlign }]}>
          Content: {action.content_id.substring(0, idTruncateLength)}...
        </Text>

        {action.rolled_back && (
          <GlassBadge text={t('admin.librarian.activityLog.rolledBack')} variant="error" />
        )}
      </View>

      {onRollback && (
        <Pressable style={styles.rollbackButton} onPress={onRollback}>
          <RotateCcw size={16} color={colors.warning} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  filterContainer: {
    minWidth: 200,
  },
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
  activityList: {
    flex: 1,
    maxHeight: 500,
  },
  activityItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    gap: spacing.xs,
  },
  activityHeader: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  contentId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  rollbackButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  pagination: {
    marginTop: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  pageButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageText: {
    fontSize: 14,
    color: colors.text,
  },
});

export default LibrarianActivityLog;
