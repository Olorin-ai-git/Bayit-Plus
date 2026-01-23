import { View, Text } from 'react-native';
import { z } from 'zod';

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
    <View className="flex-row justify-between items-center">
      <Text
        className="text-sm flex-1"
        style={{
          textAlign: isRTL ? 'right' : 'left',
          color: 'rgb(115, 115, 115)', // colors.textMuted equivalent
        }}
      >
        {label}:
      </Text>
      <Text
        className="text-sm font-medium flex-[2]"
        style={{
          textAlign: isRTL ? 'right' : 'left',
          color: '#ffffff', // colors.text
        }}
      >
        {value}
      </Text>
    </View>
  );
};

export default ScheduleDetailRow;
