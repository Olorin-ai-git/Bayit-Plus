import { View, Text, StyleSheet } from 'react-native';
import { z } from 'zod';
import { colors, fontSize } from '@olorin/design-tokens';

/**
 * Zod schema for ScheduleDetailRow props
 */
export const ScheduleDetailRowPropsSchema = z.object({
  label: z.string(),
  value: z.string(),
  isRTL: z.boolean(),
});

export type ScheduleDetailRowProps = z.infer<typeof ScheduleDetailRowPropsSchema>;

/**
 * ScheduleDetailRow Component
 *
 * Displays a single label-value pair in the schedule details section.
 * Supports RTL layout for internationalization.
 *
 * @component
 * @example
 * ```tsx
 * <ScheduleDetailRow
 *   label="Schedule"
 *   value="Daily at 02:00"
 *   isRTL={false}
 * />
 * ```
 */
const ScheduleDetailRow: React.FC<ScheduleDetailRowProps> = ({ label, value, isRTL }) => {
  // Validate props at runtime (development only)
  if (process.env.NODE_ENV !== 'production') {
    ScheduleDetailRowPropsSchema.parse({ label, value, isRTL });
  }

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.label,
          { textAlign: isRTL ? 'right' : 'left' }
        ]}
      >
        {label}:
      </Text>
      <Text
        style={[
          styles.value,
          { textAlign: isRTL ? 'right' : 'left' }
        ]}
      >
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flex: 1,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    flex: 2,
  },
});

export default ScheduleDetailRow;
