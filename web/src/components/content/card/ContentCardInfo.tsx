import { View, Text } from 'react-native';
import { z } from 'zod';
import { platformClass } from '@/utils/platformClass';

/**
 * Zod schema for ContentCardInfo props
 */
const ContentCardInfoPropsSchema = z.object({
  title: z.string(),
  year: z.string().optional(),
  localizedCategory: z.string().optional(),
  isHovered: z.boolean(),
  isRTL: z.boolean(),
});

type ContentCardInfoProps = z.infer<typeof ContentCardInfoPropsSchema>;

/**
 * ContentCardInfo - Title and metadata display
 *
 * Displays content information:
 * - Title with hover state
 * - Year and category metadata
 * - RTL text alignment support
 *
 * @component
 */
export function ContentCardInfo(props: ContentCardInfoProps) {
  const validatedProps = ContentCardInfoPropsSchema.parse(props);
  const { title, year, localizedCategory, isHovered, isRTL } = validatedProps;

  return (
    <View className="p-3">
      {/* Title */}
      <Text
        className={platformClass(
          `text-sm font-medium mb-2 ${isHovered ? 'text-purple-500' : 'text-white'}`,
          `text-sm font-medium mb-2 ${isHovered ? 'text-purple-500' : 'text-white'}`
        )}
        style={{ textAlign: isRTL ? 'right' : 'left' }}
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Metadata */}
      {(year || localizedCategory) && (
        <View
          className="flex-row items-center gap-2"
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
        >
          {year && (
            <Text className="text-xs text-gray-400">{year}</Text>
          )}
          {year && localizedCategory && (
            <Text className="text-xs text-gray-600">|</Text>
          )}
          {localizedCategory && (
            <Text className="text-xs text-gray-400">{localizedCategory}</Text>
          )}
        </View>
      )}
    </View>
  );
}
