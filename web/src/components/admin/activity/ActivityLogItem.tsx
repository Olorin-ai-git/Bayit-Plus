import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Image, FileText, Tag, Link as LinkIcon, Type, RotateCcw } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { LibrarianAction } from '@/services/librarianService';
import { format } from 'date-fns';
import { StateDiffView } from './StateDiffView';

const ActivityLogItemPropsSchema = z.object({
  action: z.custom<LibrarianAction>(),
  color: z.string(),
  icon: z.string().optional(),
  isRTL: z.boolean(),
  textAlign: z.enum(['left', 'right']),
  idTruncateLength: z.number(),
  onRollback: z.function().args().returns(z.void()).optional(),
});

export type ActivityLogItemProps = z.infer<typeof ActivityLogItemPropsSchema>;

const toCamelCase = (str: string) => {
  if (!str) return '';
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

const renderIcon = (icon?: string) => {
  if (!icon) return null;
  const iconProps = { size: 16, color: colors.background };
  switch (icon) {
    case 'Image': return <Image {...iconProps} />;
    case 'FileText': return <FileText {...iconProps} />;
    case 'Tag': return <Tag {...iconProps} />;
    case 'Link': return <LinkIcon {...iconProps} />;
    case 'Type': return <Type {...iconProps} />;
    default: return null;
  }
};

const getStateDiff = (action: LibrarianAction) => {
  const diffs: Array<{ key: string; before: any; after: any }> = [];
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

const ActivityLogItem: React.FC<ActivityLogItemProps> = ({
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

  const actionType = action.action_type || 'unknown';
  const actionTypeLabel = t(
    `admin.librarian.activityLog.actionTypes.${toCamelCase(actionType)}`,
    actionType.replace(/_/g, ' ')
  );

  const getDescription = () => {
    if (action.description) return action.description;
    const changes = Object.keys({ ...action.before_state, ...action.after_state })
      .filter(key => action.before_state[key] !== action.after_state[key]);
    if (changes.length > 0) {
      return t('admin.librarian.activityLog.updatedFields', 'Updated {{fields}}', { fields: changes.join(', ') });
    }
    return t('admin.librarian.activityLog.noDescription');
  };

  const stateDiff = getStateDiff(action);

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={[styles.container, isRTL && styles.containerRTL]}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        {renderIcon(icon)}
      </View>

      <View style={[styles.content, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
          <View style={[styles.badge, { backgroundColor: `${color}20`, borderColor: color }]}>
            <Text style={[styles.badgeText, { color }]}>{actionTypeLabel}</Text>
          </View>
          <Text style={styles.dateText}>{formattedDate}</Text>
          {action.rolled_back && (
            <View style={[styles.badge, { backgroundColor: `${colors.error}20`, borderColor: colors.error }]}>
              <Text style={[styles.badgeText, { color: colors.error }]}>
                {t('admin.librarian.activityLog.rolledBack')}
              </Text>
            </View>
          )}
        </View>

        {action.content_title && (
          <Text style={[styles.title, { textAlign }]}>{action.content_title}</Text>
        )}

        <Text style={[styles.description, { textAlign }]}>{getDescription()}</Text>

        <View style={[styles.metadataRow, isRTL && styles.rowReverse]}>
          <Text style={[styles.metadataText, { textAlign }]}>
            {t('admin.librarian.activityLog.issueType')}: {action.issue_type.replace(/_/g, ' ')}
          </Text>
          {action.confidence_score && (
            <Text style={[styles.metadataText, { textAlign }]}>
              {t('admin.librarian.activityLog.confidence')}: {(action.confidence_score * 100).toFixed(0)}%
            </Text>
          )}
          {action.auto_approved && (
            <Text style={[styles.autoApprovedText, { textAlign }]}>
              {t('admin.librarian.activityLog.autoApproved')}
            </Text>
          )}
        </View>

        {expanded && <StateDiffView diffs={stateDiff} textAlign={textAlign} />}

        <Text style={[styles.idText, { textAlign }]}>
          ID: {action.content_id.substring(0, idTruncateLength)}...
        </Text>
      </View>

      {onRollback && !action.rolled_back && (
        <Pressable
          style={styles.rollbackButton}
          onPress={(e) => {
            if (e?.stopPropagation) e.stopPropagation();
            onRollback();
          }}
        >
          <RotateCcw size={16} color={colors.warning} />
        </Pressable>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textMuted,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
    color: colors.text,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
    color: colors.textSecondary,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  autoApprovedText: {
    fontSize: 12,
    color: colors.success,
  },
  idText: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 4,
    color: colors.textMuted,
  },
  rollbackButton: {
    padding: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.warning,
  },
});

if (process.env.NODE_ENV === 'development') {
  const originalComponent = ActivityLogItem;
  (ActivityLogItem as any) = (props: any) => {
    ActivityLogItemPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default ActivityLogItem;
