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
  const { isRTL, textAlign } = useDirection();
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

  // Helper to convert snake_case to camelCase for translation keys
  const toCamelCase = (str: string) => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  // Build filter options from config with translations
  const filterOptions = [
    { label: t('admin.librarian.activityLog.allActions'), value: 'all' },
    ...config.action_types.map((actionType) => ({
      label: t(`admin.librarian.activityLog.actionTypes.${toCamelCase(actionType.value)}`),
      value: actionType.value,
    })),
  ];

  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
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
            <View style={styles.pagination}>
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
  const [expanded, setExpanded] = useState(false);
  const formattedDate = format(new Date(action.timestamp), 'MMM d, yyyy HH:mm:ss');

  // Helper to convert snake_case to camelCase for translation keys
  const toCamelCase = (str: string) => {
    if (!str) return '';
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  // Get translated action type - with safe fallbacks
  const actionType = action.action_type || 'unknown';
  const actionTypeKey = `admin.librarian.activityLog.actionTypes.${toCamelCase(actionType)}`;
  const actionTypeLabel = t(actionTypeKey, actionType.replace(/_/g, ' '));

  // Generate detailed description from before/after states if none exists
  const getDetailedDescription = () => {
    if (action.description) return action.description;

    // Generate description based on what changed
    const changes: string[] = [];
    const beforeKeys = Object.keys(action.before_state);
    const afterKeys = Object.keys(action.after_state);
    const allKeys = [...new Set([...beforeKeys, ...afterKeys])];

    allKeys.forEach(key => {
      const before = action.before_state[key];
      const after = action.after_state[key];
      if (before !== after) {
        changes.push(key);
      }
    });

    if (changes.length > 0) {
      return `Updated ${changes.join(', ')}`;
    }

    return t('admin.librarian.activityLog.noDescription');
  };

  // Get state diff summary
  const getStateDiff = () => {
    const diffs: Array<{key: string; before: any; after: any}> = [];
    const allKeys = [...new Set([
      ...Object.keys(action.before_state),
      ...Object.keys(action.after_state)
    ])];

    allKeys.forEach(key => {
      const before = action.before_state[key];
      const after = action.after_state[key];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        diffs.push({ key, before, after });
      }
    });

    return diffs;
  };

  const stateDiff = getStateDiff();

  return (
    <Pressable onPress={() => setExpanded(!expanded)} style={styles.activityItem}>
      <View style={[styles.iconWrapper, { backgroundColor: color }]}>
        {icon}
      </View>

      <View style={[styles.activityContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        {/* Header with badges and timestamp */}
        <View style={[styles.activityHeader, isRTL && styles.activityHeaderRTL]}>
          <View style={[styles.badgeContainer, { backgroundColor: color + '20', borderColor: color }]}>
            <Text style={[styles.badgeText, { color }]}>{actionTypeLabel}</Text>
          </View>
          <Text style={styles.timestamp}>{formattedDate}</Text>
          {action.rolled_back && (
            <View style={[styles.badgeContainer, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
              <Text style={[styles.badgeText, { color: colors.error }]}>
                {t('admin.librarian.activityLog.rolledBack')}
              </Text>
            </View>
          )}
        </View>

        {/* Content title (most prominent) */}
        {action.content_title && (
          <Text style={[styles.contentTitle, { textAlign }]}>{action.content_title}</Text>
        )}

        {/* Description */}
        <Text style={[styles.description, { textAlign }]}>
          {getDetailedDescription()}
        </Text>

        {/* Metadata row */}
        <View style={[styles.metadataRow, isRTL && styles.metadataRowRTL]}>
          <Text style={[styles.metadataText, { textAlign }]}>
            {t('admin.librarian.activityLog.issueType')}: {action.issue_type.replace(/_/g, ' ')}
          </Text>
          {action.confidence_score && (
            <Text style={[styles.metadataText, { textAlign }]}>
              {t('admin.librarian.activityLog.confidence')}: {(action.confidence_score * 100).toFixed(0)}%
            </Text>
          )}
          {action.auto_approved && (
            <Text style={[styles.metadataText, { textAlign, color: colors.success }]}>
              {t('admin.librarian.activityLog.autoApproved')}
            </Text>
          )}
        </View>

        {/* State changes (when expanded) */}
        {expanded && stateDiff.length > 0 && (
          <View style={styles.stateChanges}>
            <Text style={[styles.stateChangesTitle, { textAlign }]}>
              {t('admin.librarian.activityLog.changes')}:
            </Text>
            {stateDiff.map((diff, idx) => (
              <View key={idx} style={styles.stateChange}>
                <Text style={styles.stateChangeKey}>{diff.key}:</Text>
                <View style={styles.stateChangeValues}>
                  <Text style={[styles.stateChangeBefore, { textAlign }]}>
                    {typeof diff.before === 'object' ? JSON.stringify(diff.before) : String(diff.before || 'null')}
                  </Text>
                  <Text style={styles.stateChangeArrow}>→</Text>
                  <Text style={[styles.stateChangeAfter, { textAlign }]}>
                    {typeof diff.after === 'object' ? JSON.stringify(diff.after) : String(diff.after || 'null')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Content ID (less prominent) */}
        <Text style={[styles.contentId, { textAlign }]}>
          ID: {action.content_id.substring(0, idTruncateLength)}...
        </Text>
      </View>

      {onRollback && !action.rolled_back && (
        <Pressable style={styles.rollbackButton} onPress={(e) => { e.stopPropagation(); onRollback(); }}>
          <RotateCcw size={16} color={colors.warning} />
        </Pressable>
      )}
    </Pressable>
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  activityHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  badgeContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  metadataRowRTL: {
    flexDirection: 'row-reverse',
  },
  metadataText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  stateChanges: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  stateChangesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  stateChange: {
    marginBottom: spacing.xs,
  },
  stateChangeKey: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  stateChangeValues: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  stateChangeBefore: {
    fontSize: 11,
    color: colors.error,
    fontFamily: 'monospace',
    textDecorationLine: 'line-through',
  },
  stateChangeArrow: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stateChangeAfter: {
    fontSize: 11,
    color: colors.success,
    fontFamily: 'monospace',
  },
  contentId: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
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
