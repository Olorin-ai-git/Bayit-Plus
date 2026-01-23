import React, { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Play, X } from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';
import { z } from 'zod';

/**
 * WatchlistCard Component
 *
 * Individual card for displaying a watchlist item with hover effects.
 */

// Zod schema for props validation
const WatchlistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  title_en: z.string().optional(),
  title_es: z.string().optional(),
  subtitle: z.string().optional(),
  subtitle_en: z.string().optional(),
  subtitle_es: z.string().optional(),
  thumbnail: z.string().optional(),
  type: z.enum(['movie', 'series', 'live', 'podcast', 'radio', 'channel']),
  category: z.string().optional(),
  is_kids_content: z.boolean().optional(),
  year: z.string().optional(),
  duration: z.string().optional(),
  addedAt: z.string().optional(),
  progress: z.number().optional(),
});

const WatchlistCardPropsSchema = z.object({
  item: WatchlistItemSchema,
  onPress: z.function().returns(z.void()),
  onRemove: z.function().returns(z.void()),
  getLocalizedText: z.function().args(z.any(), z.string()).returns(z.string()),
});

type WatchlistItem = z.infer<typeof WatchlistItemSchema>;
type WatchlistCardProps = z.infer<typeof WatchlistCardPropsSchema>;

const getTypeEmoji = (type: WatchlistItem['type']): string => {
  switch (type) {
    case 'movie': return '🎬';
    case 'series': return '📺';
    case 'podcast': return '🎙️';
    case 'radio': return '📻';
    case 'live':
    case 'channel': return '📡';
    default: return '🎬';
  }
};

export const WatchlistCard: React.FC<WatchlistCardProps> = ({
  item,
  onPress,
  onRemove,
  getLocalizedText,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { isRTL } = useDirection();

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      className="flex-1 m-2 max-w-[20%]"
    >
      <View
        className="bg-[#0a0a0a] rounded-2xl overflow-visible border-[3px]"
        style={[
          isHovered ? styles.cardHovered : styles.cardDefault,
          { transition: 'transform 0.2s, border-color 0.2s' }
        ]}
      >
        {/* Thumbnail or placeholder */}
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-video bg-[#171717] justify-center items-center">
            <Text className="text-[32px]">📋</Text>
          </View>
        )}

        {/* Progress bar */}
        {item.progress !== undefined && item.progress > 0 && (
          <View className="absolute bottom-[52px] left-0 right-0 h-1 bg-black/50">
            <View
              className="h-full bg-purple-500"
              style={{ width: `${item.progress}%` }}
            />
          </View>
        )}

        {/* Type badge */}
        <View
          className="absolute top-2 bg-black/70 rounded-xl px-2 py-1"
          style={[isRTL ? styles.badgeLeft : styles.badgeRight]}
        >
          <Text className="text-[14px]">{getTypeEmoji(item.type)}</Text>
        </View>

        {/* Card content */}
        <View className="p-2">
          <Text
            className="text-[14px] font-semibold text-white"
            style={[isRTL ? styles.textRight : styles.textLeft]}
            numberOfLines={1}
          >
            {getLocalizedText(item, 'title')}
          </Text>
          <Text
            className="text-[12px] text-gray-400 mt-0.5"
            style={[isRTL ? styles.textRight : styles.textLeft]}
          >
            {item.year}
            {item.year && item.duration ? ' • ' : ''}
            {item.duration}
          </Text>
          {item.progress !== undefined && item.progress > 0 && (
            <Text
              className="text-[11px] text-purple-500 mt-0.5 font-semibold"
              style={[isRTL ? styles.textRight : styles.textLeft]}
            >
              {item.progress}%
            </Text>
          )}
        </View>

        {/* Hover overlay */}
        {isHovered && (
          <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/40 justify-center items-center">
            <View className="flex-row gap-4">
              <Pressable
                className="w-12 h-12 rounded-full bg-purple-500 justify-center items-center"
                onPress={onPress}
              >
                <Play size={20} color="#ffffff" fill="#ffffff" />
              </Pressable>
              <Pressable
                className="w-12 h-12 rounded-full bg-white/20 justify-center items-center"
                onPress={onRemove}
              >
                <X size={18} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardHovered: {
    borderColor: '#a855f7',
    transform: [{ scale: 1.05 }],
  },
  cardDefault: {
    borderColor: 'transparent',
  },
  badgeLeft: {
    left: 8,
  },
  badgeRight: {
    right: 8,
  },
  textRight: {
    textAlign: 'right',
  },
  textLeft: {
    textAlign: 'left',
  },
});
