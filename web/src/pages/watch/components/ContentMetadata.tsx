/**
 * Content Metadata Component
 * Displays badges with content metadata (year, duration, rating, etc.)
 */

import { View, Text } from 'react-native';
import { GlassView } from '@bayit/shared/ui';

interface ContentMetadataProps {
  year?: string;
  duration?: string;
  rating?: string;
  genre?: string;
  episodeCount?: number;
  episodesLabel?: string;
}

export function ContentMetadata({
  year,
  duration,
  rating,
  genre,
  episodeCount,
  episodesLabel = 'episodes',
}: ContentMetadataProps) {
  return (
    <View className="flex-row flex-wrap gap-3 mb-4">
      {year && (
        <GlassView className="px-3 py-1 rounded">
          <Text className="text-sm text-gray-400">{year}</Text>
        </GlassView>
      )}
      {duration && (
        <GlassView className="px-3 py-1 rounded">
          <Text className="text-sm text-gray-400">{duration}</Text>
        </GlassView>
      )}
      {rating && (
        <GlassView className="px-3 py-1 rounded bg-purple-600/30">
          <Text className="text-sm text-purple-400">{rating}</Text>
        </GlassView>
      )}
      {genre && (
        <GlassView className="px-3 py-1 rounded">
          <Text className="text-sm text-gray-400">{genre}</Text>
        </GlassView>
      )}
      {episodeCount && (
        <GlassView className="px-3 py-1 rounded">
          <Text className="text-sm text-gray-400">
            {episodeCount} {episodesLabel}
          </Text>
        </GlassView>
      )}
    </View>
  );
}
