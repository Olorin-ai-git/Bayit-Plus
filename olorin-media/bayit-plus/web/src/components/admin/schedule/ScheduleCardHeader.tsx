import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Calendar, Brain, Edit2 } from 'lucide-react';
import { z } from 'zod';
import { GlassBadge } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

/**
 * Zod schema for ScheduleCardHeader props
 */
export const ScheduleCardHeaderPropsSchema = z.object({
  mode: z.enum(['Rule-based', 'AI Agent']),
  status: z.enum(['ENABLED', 'DISABLED']),
  title: z.string(),
  textAlign: z.enum(['left', 'right', 'center']),
  onEdit: z.function().args().returns(z.void()).optional(),
  statusText: z.string(),
  statusVariant: z.enum(['success', 'error']),
});

export type ScheduleCardHeaderProps = z.infer<typeof ScheduleCardHeaderPropsSchema>;

/**
 * ScheduleCardHeader Component
 *
 * Header section of the schedule card showing icon, status badge, title, and edit button.
 *
 * @component
 * @example
 * ```tsx
 * <ScheduleCardHeader
 *   mode="AI Agent"
 *   status="ENABLED"
 *   title="Daily Content Refresh"
 *   textAlign="left"
 *   onEdit={handleEdit}
 *   statusText="Enabled"
 *   statusVariant="success"
 * />
 * ```
 */
const ScheduleCardHeader: React.FC<ScheduleCardHeaderProps> = ({
  mode,
  status,
  title,
  textAlign,
  onEdit,
  statusText,
  statusVariant,
}) => {
  // Validate props at runtime (development only)
  if (process.env.NODE_ENV !== 'production') {
    ScheduleCardHeaderPropsSchema.parse({
      mode, status, title, textAlign, onEdit, statusText, statusVariant
    });
  }

  const Icon = mode === 'AI Agent' ? Brain : Calendar;

  // Dynamic icon background style
  const iconBgStyle = mode === 'AI Agent' ? styles.iconBgAI : styles.iconBgRuleBased;

  return (
    <>
      {/* Icon + Status Badge Row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconContainer, iconBgStyle]}>
          <Icon size={24} color="#000000" />
        </View>
        <GlassBadge
          text={statusText}
          variant={statusVariant}
        />
      </View>

      {/* Title + Edit Button Row */}
      <View style={styles.titleRow}>
        <Text
          style={[styles.title, { textAlign }]}
        >
          {title}
        </Text>
        {onEdit && (
          <Pressable
            onPress={onEdit}
            style={styles.editButton}
          >
            <Edit2 size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBgAI: {
    backgroundColor: colors.secondary,
  },
  iconBgRuleBased: {
    backgroundColor: colors.primary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  editButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});

export default ScheduleCardHeader;
