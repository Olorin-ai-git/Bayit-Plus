import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Calendar, Brain, Edit2 } from 'lucide-react';
import { z } from 'zod';
import { GlassBadge } from '@bayit/shared/ui';

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
      <View className="flex-row justify-between items-center mb-4">
        <View className="w-12 h-12 rounded-md justify-center items-center" style={iconBgStyle}>
          <Icon size={24} color="#000000" />
        </View>
        <GlassBadge
          text={statusText}
          variant={statusVariant}
        />
      </View>

      {/* Title + Edit Button Row */}
      <View className="flex-row items-center justify-between mb-4">
        <Text
          className="text-xl font-semibold text-white flex-1"
          style={{ textAlign }}
        >
          {title}
        </Text>
        {onEdit && (
          <Pressable
            onPress={onEdit}
            className="p-2 rounded bg-white/5"
          >
            <Edit2 size={16} color="#a855f7" />
          </Pressable>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  iconBgAI: {
    backgroundColor: 'rgb(192, 38, 211)',
  },
  iconBgRuleBased: {
    backgroundColor: 'rgb(168, 85, 247)',
  },
});

export default ScheduleCardHeader;
