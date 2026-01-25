/**
 * ContentCardMobile Component
 *
 * Touch-optimized content card for VOD, movies, shows
 * Features:
 * - Responsive sizing based on device
 * - 2:3 aspect ratio for posters
 * - Play overlay button
 * - Glass morphism styling
 * - Touch feedback
 */

import React from 'react';
import { View, Image, Text, Pressable, Dimensions } from 'react-native';
import { GlassView } from '@bayit/shared';
import { SubtitleFlags } from '@bayit/shared/components/SubtitleFlags';
import { GlassPlaceholder } from '@olorin/glass-ui';
import { responsive } from '../utils/responsive';
import { optimizeTMDBImageUrl } from '../utils/imageUtils';
import { typography, spacing, borderRadius, colors } from '@olorin/design-tokens';

export interface ContentCardMobileProps {
  /** Content item to display */
  content: {
    id: string;
    title: string;
    posterUrl?: string;
    year?: number;
    rating?: number;
    duration?: number;
    has_subtitles?: boolean;
    available_subtitle_languages?: string[];
  };

  /** Callback when card is pressed */
  onPress: () => void;

  /** Card width (optional, auto-calculated if not provided) */
  width?: number;
}

export const ContentCardMobile: React.FC<ContentCardMobileProps> = ({
  content,
  onPress,
  width,
}) => {
  // Calculate responsive card width if not provided
  const cardWidth =
    width ||
    responsive({
      phone: (Dimensions.get('window').width - spacing.sm * 3) / 2, // Larger cards with reduced spacing
      tablet: (Dimensions.get('window').width - spacing.md * 5) / 4,
    });

  const cardHeight = cardWidth * 1.4; // Balanced aspect ratio for mobile

  return (
    <Pressable
      onPress={onPress}
      className="mb-4"
      style={{ width: cardWidth }}
      android_ripple={{ color: colors.glassLight }}
    >
      <GlassView className="rounded-lg overflow-hidden">
        {/* Poster image - optimized for mobile */}
        <View className="relative">
          {content.posterUrl ? (
            <Image
              source={{ uri: optimizeTMDBImageUrl(content.posterUrl, 'poster') }}
              className="w-full"
              style={{ height: cardHeight, backgroundColor: colors.backgroundElevated }}
              resizeMode="cover"
            />
          ) : (
            <GlassPlaceholder
              contentType="movie"
              width={cardWidth}
              height={cardHeight}
              accessibilityRole="image"
              accessibilityLabel={`${content.title} - Movie placeholder`}
              contentTitle={content.title}
              contentReason="unavailable"
            />
          )}

          {/* Subtitle Flags */}
          {content.available_subtitle_languages && content.available_subtitle_languages.length > 0 && (
            <SubtitleFlags
              languages={content.available_subtitle_languages}
              position="bottom-right"
              size="small"
              showTooltip={true}
            />
          )}
        </View>

        {/* Content info */}
        <View className="p-4">
          <Text className="text-[15px] text-white font-semibold mb-1 leading-5" numberOfLines={2}>
            {content.title}
          </Text>
          <View className="flex-row items-center flex-wrap">
            {content.year && (
              <Text className="text-xs text-gray-400">{content.year}</Text>
            )}
            {content.rating && typeof content.rating === 'number' && (
              <>
                <Text className="text-xs text-gray-500 mx-1">•</Text>
                <Text className="text-xs text-gray-400">⭐ {content.rating.toFixed(1)}</Text>
              </>
            )}
            {content.duration && typeof content.duration === 'number' && content.duration > 0 && (
              <>
                <Text className="text-xs text-gray-500 mx-1">•</Text>
                <Text className="text-xs text-gray-400">{Math.floor(content.duration / 60)}m</Text>
              </>
            )}
          </View>
        </View>

        {/* Play overlay */}
        <View className="absolute inset-0 justify-center items-center bg-transparent">
          <View className="w-14 h-14 rounded-full bg-purple-600/90 justify-center items-center">
            <Text className="text-2xl text-white ml-0.5">▶</Text>
          </View>
        </View>
      </GlassView>
    </Pressable>
  );
};
