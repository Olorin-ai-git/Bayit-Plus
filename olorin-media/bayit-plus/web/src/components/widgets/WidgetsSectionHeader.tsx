/**
 * WidgetsSectionHeader - Section header for widget groupings
 *
 * Displays section title and description for categorizing widgets
 */

import { View, Text } from 'react-native';
import { z } from 'zod';
import { useDirection } from '@/hooks/useDirection';

const WidgetsSectionHeaderPropsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

type WidgetsSectionHeaderProps = z.infer<typeof WidgetsSectionHeaderPropsSchema>;

/**
 * WidgetsSectionHeader - Section divider with title and description
 */
export default function WidgetsSectionHeader({ title, description }: WidgetsSectionHeaderProps) {
  const { textAlign } = useDirection();

  return (
    <View className="mt-6 mb-4">
      <Text className="text-xl font-semibold text-white mb-1" style={{ textAlign }}>
        {title}
      </Text>
      {description && (
        <Text className="text-sm text-gray-400" style={{ textAlign }}>
          {description}
        </Text>
      )}
    </View>
  );
}
