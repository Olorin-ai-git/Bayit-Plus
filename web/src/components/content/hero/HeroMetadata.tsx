import { View, Text } from 'react-native'
import { GlassBadge } from '@bayit/shared/ui'
import type { HeroMetadataProps } from './types'

/**
 * HeroMetadata - Displays content metadata (year, duration, rating)
 *
 * Features:
 * - Horizontal layout with consistent spacing
 * - Year and duration as text
 * - Rating as glass badge
 * - Conditional rendering (only shows if data available)
 *
 * @param year - Content release year
 * @param duration - Content duration (formatted string)
 * @param rating - Content rating (e.g., "PG-13", "TV-MA")
 */
export default function HeroMetadata({ year, duration, rating }: HeroMetadataProps) {
  // Don't render if no metadata available
  if (!year && !duration && !rating) return null

  return (
    <View className="flex-row items-center gap-4 mb-4">
      {year && (
        <Text className="text-sm text-neutral-400">
          {year}
        </Text>
      )}

      {duration && (
        <Text className="text-sm text-neutral-400">
          {duration}
        </Text>
      )}

      {rating && (
        <GlassBadge variant="default" size="sm">
          {rating}
        </GlassBadge>
      )}
    </View>
  )
}
