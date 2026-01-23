import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  Image,
  FileText,
  Tag,
  Link as LinkIcon,
  Type,
  RotateCcw,
} from 'lucide-react';
import { colors } from '@bayit/shared/theme';
import { platformClass } from '../../../utils/platformClass';
import { LibrarianAction } from '@/services/librarianService';
import { format } from 'date-fns';
import { StateDiffView } from './StateDiffView';

// Zod schema for props validation
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

// Helper to convert snake_case to camelCase for translation keys
const toCamelCase = (str: string) => {
  if (!str) return '';
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Render icon component
const renderIcon = (icon?: string) => {
  if (!icon) return null;
  const iconProps = { size: 16, color: colors.background };
  switch (icon) {
    case 'Image':
      return <Image {...iconProps} />;
    case 'FileText':
      return <FileText {...iconProps} />;
    case 'Tag':
      return <Tag {...iconProps} />;
    case 'Link':
      return <LinkIcon {...iconProps} />;
    case 'Type':
      return <Type {...iconProps} />;
    default:
      return null;
  }
};

// Get state diff summary
const getStateDiff = (action: LibrarianAction) => {
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

/**
 * ActivityLogItem - Individual activity entry
 * Displays a single librarian action with expandable state changes.
 */
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

  // Get translated action type
  const actionType = action.action_type || 'unknown';
  const actionTypeLabel = t(
    `admin.librarian.activityLog.actionTypes.${toCamelCase(actionType)}`,
    actionType.replace(/_/g, ' ')
  );

  // Generate description
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

  // Dynamic styles for RTL/LTR alignment
  const headerRowStyle = [
    styles.headerRow,
    isRTL ? styles.flexRowReverse : null,
  ];

  const contentAlignStyle = {
    alignItems: isRTL ? 'flex-end' : 'flex-start' as const,
  };

  const metadataRowStyle = [
    styles.metadataRow,
    isRTL ? styles.flexRowReverse : null,
  ];

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      className={platformClass('flex-row py-4 px-2 border-b gap-4 items-start')}
      style={{ borderBottomColor: colors.glassBorder }}
    >
      <View className={platformClass('w-8 h-8 rounded-full justify-center items-center')} style={{ backgroundColor: color }}>
        {renderIcon(icon)}
      </View>

      <View className={platformClass('flex-1 gap-1')} style={contentAlignStyle}>
        {/* Header with badges */}
        <View className={platformClass('flex-row gap-2 items-center flex-wrap mb-1')} style={headerRowStyle}>
          <View className={platformClass('px-2 py-0.5 rounded-sm border')} style={{ backgroundColor: `${color}20`, borderColor: color }}>
            <Text className={platformClass('text-[11px] font-semibold')} style={{ color }}>{actionTypeLabel}</Text>
          </View>
          <Text className={platformClass('text-xs font-mono')} style={{ color: colors.textMuted }}>{formattedDate}</Text>
          {action.rolled_back && (
            <View className={platformClass('px-2 py-0.5 rounded-sm border')} style={{ backgroundColor: `${colors.error}20`, borderColor: colors.error }}>
              <Text className={platformClass('text-[11px] font-semibold')} style={{ color: colors.error }}>
                {t('admin.librarian.activityLog.rolledBack')}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        {action.content_title && (
          <Text className={platformClass('text-base font-semibold leading-5 mb-1')} style={{ textAlign, color: colors.text }}>
            {action.content_title}
          </Text>
        )}

        {/* Description */}
        <Text className={platformClass('text-sm leading-5 mb-1')} style={{ textAlign, color: colors.textSecondary }}>
          {getDescription()}
        </Text>

        {/* Metadata */}
        <View className={platformClass('flex-row gap-4 flex-wrap mb-1')} style={metadataRowStyle}>
          <Text className={platformClass('text-xs')} style={{ textAlign, color: colors.textMuted }}>
            {t('admin.librarian.activityLog.issueType')}: {action.issue_type.replace(/_/g, ' ')}
          </Text>
          {action.confidence_score && (
            <Text className={platformClass('text-xs')} style={{ textAlign, color: colors.textMuted }}>
              {t('admin.librarian.activityLog.confidence')}: {(action.confidence_score * 100).toFixed(0)}%
            </Text>
          )}
          {action.auto_approved && (
            <Text className={platformClass('text-xs')} style={{ textAlign, color: colors.success }}>
              {t('admin.librarian.activityLog.autoApproved')}
            </Text>
          )}
        </View>

        {/* State changes */}
        {expanded && <StateDiffView diffs={stateDiff} textAlign={textAlign} />}

        {/* Content ID */}
        <Text className={platformClass('text-[11px] font-mono mt-1')} style={{ textAlign, color: colors.textMuted }}>
          ID: {action.content_id.substring(0, idTruncateLength)}...
        </Text>
      </View>

      {/* Rollback button */}
      {onRollback && !action.rolled_back && (
        <Pressable
          className={platformClass('p-2 rounded-sm border')}
          style={{ borderColor: colors.warning }}
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
  headerRow: {},
  flexRowReverse: {
    flexDirection: 'row-reverse',
  },
  metadataRow: {},
});

// Validate props at runtime in development
if (process.env.NODE_ENV === 'development') {
  const originalComponent = ActivityLogItem;
  (ActivityLogItem as any) = (props: any) => {
    ActivityLogItemPropsSchema.parse(props);
    return originalComponent(props);
  };
}

export default ActivityLogItem;
